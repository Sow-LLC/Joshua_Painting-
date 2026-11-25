// www.joshuapaintingjm.com → joshuapaintingjm.com (same path and query), permanent redirect.
export default {
  fetch(req) {
    const url = new URL(req.url);
    url.hostname = "joshuapaintingjm.com";
    return Response.redirect(url.toString(), 301);
  },
};
