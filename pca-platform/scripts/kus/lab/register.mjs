import { register } from "node:module";
import "./ctx.mjs";
register("./hooks.mjs", import.meta.url);
