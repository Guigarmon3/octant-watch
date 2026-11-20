/* Sirve el build de OCTANT bajo guigarmon3.online/octant.

   El Worker recibe la ruta completa (/octant/...), quita el prefijo y deja que
   el binding ASSETS resuelva el archivo dentro de dist. Si no existe y la ruta
   no parece un archivo, devuelve index.html para que la SPA arranque. */

const BASE = "/octant";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === BASE) {
      return Response.redirect(`${url.origin}${BASE}/`, 308);
    }

    let target = url.pathname.startsWith(BASE)
      ? url.pathname.slice(BASE.length)
      : url.pathname;

    if (!target) target = "/";
    if (target.endsWith("/")) target += "index.html";

    let response = await env.ASSETS.fetch(
      new URL(target + url.search, url.origin).toString(),
    );

    if (response.status === 404 && !/\.[a-z0-9]+$/i.test(target)) {
      response = await env.ASSETS.fetch(
        new URL("/index.html", url.origin).toString(),
      );
    }

    return response;
  },
};
