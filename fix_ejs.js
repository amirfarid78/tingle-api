const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'views', 'admin');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ejs') && f !== 'layout.ejs' && f !== 'login.ejs' && f !== 'dashboard.ejs');

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace the opening include layout literal syntax with partials/header
    // Looks like: <%- include('layout', { body: ` ... ` }) %>
    const headerRegex = /<%- include\('layout',\s*\{\s*(?:pageTitle:\s*'([^']+)',\s*)?(?:page:\s*'([^']+)',\s*)?body:\s*`/s;
    const match = content.match(headerRegex);

    if (match) {
        // Build the replacement header
        const pageTitle = match[1] ? match[1] : (file.charAt(0).toUpperCase() + file.slice(1, -4));
        const page = match[2] ? match[2] : file.slice(0, -4);

        let newHeader = `<%- include('partials/header', { pageTitle: '${pageTitle}', page: '${page}' }) %>\n`;

        content = content.replace(headerRegex, newHeader);

        // Replace the closing literal string interpolations with partials/footer
        // Usually looks like: `, pageTitle: 'title', page: 'page' }) %>
        const footerRegex = /`,\s*pageTitle:\s*'[^']+',\s*page:\s*'[^']+'\s*}\s*\)\s*%>/;
        const fallbackRegex = /`\s*\}\)\s*%>/;

        if (footerRegex.test(content)) {
            content = content.replace(footerRegex, `<%- include('partials/footer') %>`);
        } else if (fallbackRegex.test(content)) {
            content = content.replace(fallbackRegex, `<%- include('partials/footer') %>`);
        }

        fs.writeFileSync(filePath, content);
        console.log(`✅ Updated ${file}`);
    } else {
        console.log(`⚠️ Skipped ${file} (no match)`);
    }
});
