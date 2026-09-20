async function test() {
  try {
    const target = 'https://jurisprudencia.csm.org.pt/';
    const url = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(target);
    console.log("Fetching CSM via AllOrigins proxy:", url);
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    const text = await res.text();
    console.log("STATUS:", res.status);
    console.log("BODY LENGTH:", text.length);
    console.log("BODY SAMPLE (first 1000 chars):", text.substring(0, 1000));
  } catch (err) {
    console.error("PROXY FETCH ERROR:", err);
  }
}

test();
