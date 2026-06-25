import { type RouteConfig, index, route } from "@react-router/dev/routes"

export default [
  index("routes/home.tsx"),
  route("daily", "routes/daily.tsx"),
  route("unlimited", "routes/unlimited.tsx"),
  route("rapid", "routes/rapid.tsx"),
  route("api/guess", "routes/api.guess.tsx"),
] satisfies RouteConfig
