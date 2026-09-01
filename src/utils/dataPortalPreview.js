import { dp_link, table_preview, stats_menu, metadata_text } from "./elements.js";
import { titleCase } from "./titleCase.js";
import { other_vars } from "./addOtherMenus.js";

export function dataPortalPreview(tables, matrix, data, result, stat_label, geog_type, year, unit, time_series) {

    let rows = tables[matrix].rows;

        dp_link.innerHTML = `Showing rows 1-${Math.min(data.length, 10)} of ${rows.toLocaleString("en-GB")}. See this full dataset on <a href = "https://data.nisra.gov.uk/table/${matrix}" target = "_blank">NISRA Data Portal</a> or download it in <a href = "https://ws-data.nisra.gov.uk/public/api.restful/PxStat.Data.Cube_API.ReadDataset/${matrix}/CSV/1.0/en">CSV format</a>.`

         while (table_preview.firstChild) {
            table_preview.removeChild(table_preview.firstChild)
         }

         let header_row = document.createElement("tr");

         let headers = Object.keys(result.dimension);

         for (let i = 0; i < headers.length; i ++) {
            if (headers[i] != "NI") {
                let th = document.createElement("th");
                th.textContent = result.dimension[headers[i]].label;
                header_row.appendChild(th);
            }
         }

         let unit_header = document.createElement("th");
         let value_header = document.createElement("th");

         unit_header.textContent = "Unit";
         value_header.textContent = "Value";
         value_header.classList.add("text-end");

         header_row.appendChild(unit_header);
         header_row.appendChild(value_header);

         table_preview.appendChild(header_row);

         for (let i = 0; i < Math.min(data.length, 10); i ++) {
            let tr = document.createElement("tr");

            let stat_cell = document.createElement("td");
            stat_cell.textContent = stat_label;
            tr.appendChild(stat_cell);

            let year_cell = document.createElement("td");
            if (["none", "NI"].includes(geog_type)) {
                year_cell.textContent = time_series[i];
            } else {
                year_cell.textContent = year;
            }
            tr.appendChild(year_cell);

            if (!["none", "NI"].includes(geog_type)) {
                let geog_cell = document.createElement("td");
                geog_cell.textContent = titleCase(Object.values(result.dimension[geog_type].category.label)[i]);
                tr.appendChild(geog_cell);
            }

            for (let j = 0; j < other_vars.length; j ++) {
                let other_cell = document.createElement("td");
                other_cell.textContent = Object.values(result.dimension[other_vars[j]].category.label)[0];
                tr.append(other_cell);
            }

            let unit_cell = document.createElement("td");
            unit_cell.textContent = unit;
            tr.appendChild(unit_cell);

            let value_cell = document.createElement("td");
            if (data[i] == null) {
                value_cell.textContent = "..";
            } else {
                let decimals = result.dimension.STATISTIC.category.unit[stats_menu.value].decimals;
                value_cell.textContent = data[i].toLocaleString("en-GB", {
                    minimumFractionDigits: decimals,
                    maximumFractionDigits: decimals
                });
            }
            
            value_cell.style = "text-align: right;";
            tr.appendChild(value_cell);

            table_preview.appendChild(tr);
         }

         let note_cleaned = result.note[0].replaceAll("\r", "<br>").replaceAll("[b]", "<strong>").replaceAll("[/b]", "</strong>").replaceAll("[i]", "<em>").replaceAll("[/i]", "</em>").replaceAll("[u]", "<u>").replaceAll("[/u]", "</u>");

         // Convert [url=...]...[/url] into <a href="...">...</a>
        note_cleaned = note_cleaned.replace(
            /\[url=([a-zA-Z][a-zA-Z0-9+.-]*:[^\]]+)\](.*?)\[\/url\]/gi,
            (match, url, text) => {
                if (url.toLowerCase().startsWith("mailto:")) {
                return `<a href="${url}">${text}</a>`;
                } else {
                return `<a href="${url}" target="_blank">${text}</a>`;
                }
            }
        );



         metadata_text.innerHTML = note_cleaned;   

}