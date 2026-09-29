/// <reference path="./kino.d.ts" />

// --- CAPABILITY 1: BÚSQUEDA GLOBAL (search) ---
export async function search(query) {
  await Promise.resolve();

  if (!query || !query.q) {
    return { items: [] };
  }

  // Constantes de entorno locales protegidas dentro de la función
  const clientID = "cb809f64db274fcbd1a80d5dd61d4a044fa7f13b632ed70df04dd2b1d3d5f661"; 
  const fetchUrl = "https://trakt.tv" + encodeURIComponent(query.q);

  try {
    const response = await kino.fetch(fetchUrl, {
      timeoutMs: 10000,
      headers: {
        "Content-Type": "application/json",
        "trakt-api-version": "2",
        "trakt-api-key": clientID
      }
    });

    if (!response || !response.ok) return { items: [] };
    const data = response.json();
    if (!data || data.length === 0) return { items: [] };

    const outputItems = [];
    for (var i = 0; i < data.length; i++) {
      var result = data[i];
      if (!result || !result.movie || !result.movie.ids) continue;

      var movie = result.movie;
      var traktId = parseInt(movie.ids.trakt, 10);
      var tmdbId = parseInt(movie.ids.tmdb, 10);
      if (isNaN(traktId)) continue;

      // El contrato de Kino exige inyectar la propiedad 'ids' para activar el elenco y los trailers automáticamente
      outputItems.push({
        id: "trakt-player-multi:movie-" + traktId,
        ref: "movie|" + (isNaN(tmdbId) ? traktId : tmdbId),
        title: String(movie.title || "Sin título"),
        kind: "movie",
        year: movie.year ? String(movie.year) : undefined,
        ids: { tmdb: isNaN(tmdbId) ? traktId : tmdbId }
      });
    }

    return { items: outputItems };

  } catch (error) {
    kino.log("Error en search de Trakt:", error.message);
    return { items: [] };
  }
}

// --- CAPABILITY 2: DESGLOSE DE EPISODIOS (episodes) ---
export async function episodes(ref) {
  await Promise.resolve();

  if (!ref) return { series: { title: "Contenido" }, episodes: [] };

  const parts = String(ref).split("|");
  const tmdbId = parseInt(parts[1], 10);
  if (isNaN(tmdbId)) return { series: { title: "Contenido" }, episodes: [] };

  // Trakt utiliza la API extendida para desglosar temporadas completas de un solo golpe
  const clientID = "cb809f64db274fcbd1a80d5dd61d4a044fa7f13b632ed70df04dd2b1d3d5f661";
  const fetchUrl = "https://trakt.tv" + tmdbId + "/seasons?extended=episodes";

  try {
    const response = await kino.fetch(fetchUrl, {
      timeoutMs: 10000,
      headers: {
        "Content-Type": "application/json",
        "trakt-api-version": "2",
        "trakt-api-key": clientID
      }
    });

    if (!response || !response.ok) return { series: { title: "Película" }, episodes: [] };
    const seasonsData = response.json();
    const outputEpisodes = [];

    for (var s = 0; s < seasonsData.length; s++) {
      var season = seasonsData[s];
      if (!season || season.number === 0) continue; // Ignoramos especiales

      var sNum = parseInt(season.number, 10);
      var epsList = season.episodes || [];

      for (var e = 0; e < epsList.length; e++) {
        var ep = epsList[e];
        outputEpisodes.push({
          season: sNum,
          number: parseInt(ep.number, 10),
          ref: "series|" + tmdbId + "|" + sNum + "|" + ep.number,
          title: String(ep.title || "Episodio " + ep.number)
        });
      }
    }

    return {
      series: { title: "Serie Vinculada" },
      episodes: outputEpisodes
    };

  } catch (error) {
    kino.log("Error en episodes de Trakt:", error.message);
    return { series: { title: "Película" }, episodes: [] };
  }
}

// --- CAPABILITY 3: RESOLUCIÓN MULTIMEDIA (resolve) ---
export async function resolve(ref) {
  await Promise.resolve();

  if (!ref) return { url: "" };

  try {
    const parts = String(ref).trim().split("|");
    const kind = parts[0];
    const id = parts[1];

    var streamUrl = "";

    if (parts.length >= 4) {
      var season = parts[2];
      var episode = parts[3];
      streamUrl = "https://vidsrc.to" + id + "/" + season + "/" + episode;
    } else {
      streamUrl = "https://vidsrc.to" + id;
    }

    return {
      url: streamUrl,
      expiresInSeconds: 3600,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
      }
    };

  } catch (error) {
    kino.log("Error en resolve de Trakt:", error.message);
    return { url: "" };
  }
}
