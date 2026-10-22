// 감열지 포토부스 오프라인 저장용 서비스 워커 (build.py 가 만듦)
const CACHE = "booth-v1.2.2";
const FILES = ["./", "index.html", "facemesh/face_mesh.binarypb", "facemesh/face_mesh.js", "facemesh/face_mesh_solution_packed_assets.data", "facemesh/face_mesh_solution_packed_assets_loader.js", "facemesh/face_mesh_solution_simd_wasm_bin.data", "facemesh/face_mesh_solution_simd_wasm_bin.js", "facemesh/face_mesh_solution_simd_wasm_bin.wasm", "facemesh/face_mesh_solution_wasm_bin.js", "facemesh/face_mesh_solution_wasm_bin.wasm"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith("booth-") && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // 페이지 자체: 인터넷이 되면 새 버전을 받고(저장도 갱신), 안 되면 저장된 것
  if (req.mode === "navigate" || url.pathname.endsWith("/index.html")) {
    e.respondWith((async () => {
      try {
        const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 4000);
        const r = await fetch(req, { signal: ctl.signal }); clearTimeout(t);
        if (r.ok) { const cl = r.clone(); (await caches.open(CACHE)).put("index.html", cl); }
        return r;
      } catch (err) {
        return (await caches.match("index.html", { ignoreSearch: true })) || (await caches.match("./")) || Response.error();
      }
    })());
    return;
  }
  // 나머지(얼굴 인식 파일 등): 저장된 것 먼저, 없으면 받아서 저장
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok) { const cl = res.clone(); caches.open(CACHE).then((c) => c.put(req, cl)); }
    return res;
  })));
});
