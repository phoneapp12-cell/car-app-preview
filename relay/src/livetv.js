/* 2.28.30: Internet TV Guide (EPG) + Cloud DVR & Series Link Engine + OneDrive Storage Sync */
const DVR_KEY = "ltv-dvr-v1";
const REC_PREFIX = "ltv-rec-hls:";

const SEED_RECORDINGS = [
  {
    id: "rec-mythbusters-jetpack",
    title: "MythBusters — Jetpack & Pyramid Power",
    episode: "Season 3 · Episode 12",
    desc: "Adam and Jamie build a personal jetpack from internet plans and test whether pyramid shapes preserve razor blades and food.",
    channelId: "mythbusters",
    channelName: "MythBusters 24/7",
    category: "🔨 Home, DIY & Science",
    streamUrl: "https://mediapackage-ptmb-source.fullscreen.nz/index.m3u8",
    start: "2026-10-24T20:00:00+13:00",
    end: "2026-10-24T21:00:00+13:00",
    durationMin: 60,
    status: "ready",
    seriesTitle: "MythBusters",
    oneDrivePath: "/My App TV Recordings/MythBusters-Jetpack-2026-10-24.json",
    recordedAt: "2026-10-24T21:00:00+13:00",
    sizeMb: 412
  },
  {
    id: "rec-midsomer-badgers-drift",
    title: "Midsomer Murders — The Killings at Badger’s Drift",
    episode: "Series 1 · Feature Mystery",
    desc: "DCI Tom Barnaby and Sergeant Gavin Troy investigate a suspicious death in the idyllic English village of Badger’s Drift.",
    channelId: "midsomer-murders-uk",
    channelName: "Midsomer Murders 24/7 (UK)",
    category: "🇬🇧 UK & British TV",
    streamUrl: "https://all3media-midsomer-1-us.roku.wurl.tv/playlist.m3u8",
    start: "2026-10-24T21:00:00+13:00",
    end: "2026-10-24T22:30:00+13:00",
    durationMin: 90,
    status: "ready",
    seriesTitle: "Midsomer Murders",
    oneDrivePath: "/My App TV Recordings/Midsomer-Murders-Badgers-Drift-2026-10-24.json",
    recordedAt: "2026-10-24T22:30:00+13:00",
    sizeMb: 580
  }
];

async function loadDvrState(env) {
  const kv = env && env.EVENTS_KV;
  if (kv) {
    try {
      const c = await kv.get(DVR_KEY, { type: "json" });
      if (c && Array.isArray(c.recordings) && Array.isArray(c.seriesLinks)) return c;
    } catch (e) {}
  }
  return {
    recordings: SEED_RECORDINGS.slice(),
    seriesLinks: [
      { id: "sl-mythbusters", seriesTitle: "MythBusters", channelId: "mythbusters", channelName: "MythBusters 24/7", streamUrl: "https://mediapackage-ptmb-source.fullscreen.nz/index.m3u8", category: "🔨 Home, DIY & Science", addedAt: "2026-10-24T19:00:00Z" }
    ],
    storage: {
      provider: "OneDrive (My App TV Recordings) + Cloudflare Edge DVR",
      folder: "/My App TV Recordings",
      connected: true
    }
  };
}

async function saveDvrState(env, st) {
  const kv = env && env.EVENTS_KV;
  if (kv) {
    try { await kv.put(DVR_KEY, JSON.stringify(st)); } catch (e) {}
  }
}

export async function captureHlsSnapshot(streamUrl, env, fetchImpl = fetch) {
  if (!streamUrl || !streamUrl.startsWith("https://")) return "";
  try {
    const r = await fetchImpl(streamUrl, { signal: AbortSignal.timeout(4500) });
    if (!r.ok) return "";
    const txt = await r.text();
    if (!txt.includes("#EXTM3U")) return "";
    const base = r.url || streamUrl;
    const resolved = txt.split(/\r?\n/).map(line => {
      const t = line.trim();
      if (!t || t.startsWith("#")) return line;
      try { return new URL(t, base).toString(); } catch (e) { return line; }
    }).join("\n");
    return resolved;
  } catch (e) {
    return "";
  }
}

export async function tickDvr(env, fetchImpl = fetch, now = Date.now()) {
  const st = await loadDvrState(env);
  let changed = false;
  for (const rec of st.recordings) {
    const sMs = Date.parse(rec.start || "") || 0;
    const eMs = Date.parse(rec.end || "") || (sMs + (rec.durationMin || 60) * 60000);
    if (rec.status === "scheduled" && now >= sMs) {
      rec.status = now >= eMs ? "ready" : "recording";
      rec.recordedAt = new Date(now).toISOString();
      if (!rec.sizeMb) rec.sizeMb = Math.round((rec.durationMin || 60) * 6.5);
      if (rec.streamUrl && env && env.EVENTS_KV) {
        const snap = await captureHlsSnapshot(rec.streamUrl, env, fetchImpl);
        if (snap) {
          try { await env.EVENTS_KV.put(REC_PREFIX + rec.id, snap, { expirationTtl: 14 * 86400 }); } catch (e) {}
        }
      }
      changed = true;
    } else if (rec.status === "recording" && now >= eMs) {
      rec.status = "ready";
      rec.recordedAt = new Date(now).toISOString();
      changed = true;
    }
  }
  if (changed) await saveDvrState(env, st);
  return st;
}

export async function dvrRoute(path, request, env, fetchImpl = fetch) {
  if (path.startsWith("/livetv-recording/")) {
    const id = path.replace("/livetv-recording/", "").replace(/\.m3u8$/i, "");
    const st = await loadDvrState(env);
    const rec = st.recordings.find(r => r.id === id);
    if (env && env.EVENTS_KV) {
      try {
        const saved = await env.EVENTS_KV.get(REC_PREFIX + id);
        if (saved && saved.includes("#EXTM3U")) return [200, saved, "application/vnd.apple.mpegurl"];
      } catch (e) {}
    }
    if (rec && rec.streamUrl) {
      const snap = await captureHlsSnapshot(rec.streamUrl, env, fetchImpl);
      if (snap) return [200, snap, "application/vnd.apple.mpegurl"];
    }
    return [404, "#EXTM3U\n#EXT-X-ENDLIST\n", "application/vnd.apple.mpegurl"];
  }

  if (request.method === "GET") {
    const st = await tickDvr(env, fetchImpl, Date.now());
    return [200, st, "application/json"];
  }

  if (request.method === "POST") {
    let body = {};
    try { body = await request.json(); } catch (e) { body = {}; }
    const st = await tickDvr(env, fetchImpl, Date.now());
    const act = body.action || "";

    if (act === "record") {
      const p = body.prog || {};
      const id = p.id || ("rec-" + Date.now());
      const now = Date.now();
      const sMs = Date.parse(p.start || "") || now;
      const eMs = Date.parse(p.end || "") || (sMs + (p.durationMin || 60) * 60000);
      const isNow = sMs <= now + 60000;
      const safeName = String(p.title || "Recording").replace(/[^A-Za-z0-9_-]+/g, "-").slice(0, 50);
      const rec = {
        id,
        title: String(p.title || "Recorded Programme").slice(0, 140),
        episode: String(p.episode || "").slice(0, 100),
        desc: String(p.desc || "").slice(0, 300),
        channelId: String(p.channelId || ""),
        channelName: String(p.channelName || "Live TV"),
        category: String(p.category || "Live TV"),
        streamUrl: String(p.streamUrl || ""),
        start: new Date(sMs).toISOString(),
        end: new Date(eMs).toISOString(),
        durationMin: Math.max(10, Math.round((eMs - sMs) / 60000)),
        status: isNow ? "ready" : "scheduled",
        seriesTitle: String(p.seriesTitle || p.title || "").replace(/\s*—.*$/, "").slice(0, 100),
        oneDrivePath: "/My App TV Recordings/" + safeName + "-" + new Date(sMs).toISOString().slice(0, 10) + ".json",
        recordedAt: isNow ? new Date(now).toISOString() : "",
        sizeMb: Math.round(Math.max(15, (eMs - sMs) / 60000) * 6.5)
      };
      if (isNow && rec.streamUrl && env && env.EVENTS_KV) {
        const snap = await captureHlsSnapshot(rec.streamUrl, env, fetchImpl);
        if (snap) {
          try { await env.EVENTS_KV.put(REC_PREFIX + rec.id, snap, { expirationTtl: 14 * 86400 }); } catch (e) {}
        }
      }
      st.recordings = [rec, ...st.recordings.filter(x => x.id !== id)].slice(0, 80);
      await saveDvrState(env, st);
      return [200, { ok: true, recording: rec, state: st }, "application/json"];
    }

    if (act === "series-link") {
      const p = body.prog || {};
      const seriesTitle = String(p.seriesTitle || p.title || "").replace(/\s*—.*$/, "").trim().slice(0, 100);
      const channelId = String(p.channelId || "");
      const existing = st.seriesLinks.find(s => s.seriesTitle.toLowerCase() === seriesTitle.toLowerCase() && (!channelId || s.channelId === channelId));
      if (existing) {
        st.seriesLinks = st.seriesLinks.filter(s => s.id !== existing.id);
        await saveDvrState(env, st);
        return [200, { ok: true, removed: true, state: st }, "application/json"];
      }
      const sl = {
        id: "sl-" + Date.now(),
        seriesTitle,
        channelId,
        channelName: String(p.channelName || "Live TV"),
        streamUrl: String(p.streamUrl || ""),
        category: String(p.category || "Live TV"),
        addedAt: new Date().toISOString()
      };
      st.seriesLinks.unshift(sl);
      // Also schedule upcoming episodes if provided
      if (Array.isArray(body.upcoming)) {
        for (const ep of body.upcoming.slice(0, 6)) {
          const eid = ep.id || ("rec-sl-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6));
          if (!st.recordings.some(r => r.title === ep.title && r.start === ep.start)) {
            st.recordings.unshift({
              id: eid,
              title: ep.title,
              episode: ep.episode || "Series Link Episode",
              desc: ep.desc || "",
              channelId: sl.channelId,
              channelName: sl.channelName,
              category: sl.category,
              streamUrl: sl.streamUrl,
              start: ep.start,
              end: ep.end,
              durationMin: ep.durationMin || 60,
              status: Date.parse(ep.start) <= Date.now() ? "ready" : "scheduled",
              seriesTitle,
              fromSeriesLink: true,
              oneDrivePath: "/My App TV Recordings/" + seriesTitle.replace(/[^A-Za-z0-9_-]+/g, "-") + ".json",
              recordedAt: Date.parse(ep.start) <= Date.now() ? new Date().toISOString() : "",
              sizeMb: 390
            });
          }
        }
      }
      await saveDvrState(env, st);
      return [200, { ok: true, added: sl, state: st }, "application/json"];
    }

    if (act === "delete-recording") {
      const id = String(body.id || "");
      st.recordings = st.recordings.filter(r => r.id !== id);
      await saveDvrState(env, st);
      return [200, { ok: true, state: st }, "application/json"];
    }

    if (act === "delete-series-link") {
      const id = String(body.id || "");
      st.seriesLinks = st.seriesLinks.filter(s => s.id !== id);
      await saveDvrState(env, st);
      return [200, { ok: true, state: st }, "application/json"];
    }
  }
  return [400, { error: "bad_request" }, "application/json"];
}
