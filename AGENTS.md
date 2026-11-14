<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- NASA public reads use cached, timeout-bounded TanStack server functions in src/lib/nasa.functions.ts; FIRMS credentials stay server-only, and simulation is explicitly labeled to avoid misrepresenting emergency data.
- Department filtering uses vendored geoBoundaries ADM1 polygons, not rectangular department approximations; why: national bounding boxes include neighboring countries.
- Shared NASA queries and the useNasa hook power command/mobile maps; preserve null measurements and never invent logistics for real detections.
- Router dehydrates and hydrates its per-request QueryClient cache; why: NASA loader data must match the first browser render.
- GIBS uses advertised dated VIIRS raster and MODIS vector WMTS layers; dynamically load Leaflet.VectorGrid with Leaflet to preserve SSR safety.
- Maps use Leaflet loaded via dynamic import inside useEffect (src/components/centinela/TacticalMap.tsx); why: Leaflet touches window and breaks SSR.
- Fire operations use Turf geodesics and explicitly unvalidated wind-driven scenarios; why: missing fuels, slopes, current weather and perimeters preclude operational forecasts or AI claims.
- Field messages use authenticated owner-only RLS with GPS consent; why: unverified participants must not read other people's private emergency coordinates.
- Sound is opt-in via Web Audio, and real alert triggers exclude demo/stale detections; why: browser audio requires user interaction and simulated data must not cause emergency alarms.

- Public maps do not require sign-in; report identity comes from Cloud OAuth and owner-scoped RLS, never visual credential simulations. Why: viewing detections is public while emergency coordinates stay private.
- Escape external labels before inserting them into Leaflet popup HTML. Why: collaborative water-point names are untrusted input.
