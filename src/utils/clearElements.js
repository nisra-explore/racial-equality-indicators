import {
    table_tabs,
    table_tabs_content,
} from "./elements.js";

/**
 * Function for clearing out HTML elements
 *
 */
export async function clearElements() {

    table_tabs.innerHTML = "";
    table_tabs_content.innerHTML = "";


}