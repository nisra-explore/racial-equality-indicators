import { clearElements } from "./clearElements.js";
import { createMenus } from "./createMenus.js";

export async function refreshRoute() {

    await clearElements();

    await createMenus();
}