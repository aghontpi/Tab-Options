import { escapeHTML } from './dom.util.js';

export function generateExportHTML(
  pageTitle,
  headerTitle,
  introText,
  tabListItemsHTML
) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>tabOptions - ${escapeHTML(pageTitle)}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 15px;
            background-color: #f4f7f6;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            min-height: calc(100vh - 30px);
        }
        .container {
            max-width: 700px;
            width: 100%;
            background-color: #fff;
            padding: 20px 25px;
            border-radius: 8px;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.07);
            margin-top: 15px;
            margin-bottom: 15px;
        }
        h1 {
            color: #0056b3;
            text-align: center;
            margin-top: 0;
            margin-bottom: 15px;
            font-size: 1.6em;
            font-weight: 600;
        }
        p.intro {
            color: #555;
            margin-bottom: 20px;
            text-align: center;
            font-size: 1em;
        }
        ul {
            list-style: none;
            padding: 0;
            margin: 0 0 20px 0;
        }
        ul:empty {
            margin-bottom: 0;
        }
        li {
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            margin-bottom: 10px;
            padding: 10px 15px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            transition: transform 0.1s ease-out, box-shadow 0.1s ease-out;
        }
        li:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }
        li:last-child {
            margin-bottom: 0;
        }
        .tab-info {
            flex-grow: 1;
            overflow: hidden;
        }
        .tab-info a.tab-title-link {
            text-decoration: none;
            color: #007bff;
            font-weight: 600;
            display: block;
            font-size: 1em;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 2px;
        }
        .tab-info a.tab-title-link:hover {
            text-decoration: underline;
            color: #0056b3;
        }
        .tab-info .url {
            font-size: 0.8em;
            color: #6c757d;
            display: block;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .store-placeholder {
            text-align: center;
            color: #5a6268;
            margin-top: 25px;
            font-size: 0.85em;
            border-top: 1px solid #e9ecef;
            padding-top: 20px;
        }
        .store-placeholder a {
            color: #0069d9;
            text-decoration: none;
            font-weight: 500;
        }
        .store-placeholder a:hover {
            text-decoration: underline;
            color: #004a99;
        }
        .no-tabs-message {
            text-align: center;
            color: #777;
            font-style: italic;
            padding: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${escapeHTML(headerTitle)}</h1>
        <p class="intro">${escapeHTML(introText)}</p>
        <ul>${tabListItemsHTML}</ul>
        ${tabListItemsHTML.trim() === '' ? '<p class="no-tabs-message">No tabs were exported.</p>' : ''}
        <p class="store-placeholder">
            Thank you for using tabOptions! Help us improve by
            <a href="https://chromewebstore.google.com/detail/tab-options/kafdoidjnnbjciplpkhhfjoefkpfbplj/reviews" target="_blank" rel="noopener noreferrer">leaving a review</a>.
            <br>
            You can also find us on the
            <a href="https://chromewebstore.google.com/detail/tab-options/kafdoidjnnbjciplpkhhfjoefkpfbplj" target="_blank" rel="noopener noreferrer">Chrome Web Store</a>
            or the
            <a href="https://addons.mozilla.org/en-US/firefox/addon/tab-options-open-source/" target="_blank" rel="noopener noreferrer">Firefox Add-ons Store</a>.
        </p>
    </div>
</body>
</html>`;
}
