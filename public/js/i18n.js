// public/js/i18n.js

// Object to store translations for different languages.
const translations = {};

// Loads translation data for the given language, applies it to the page, and dispatches a language change event.
async function loadTranslations(lang) {
    try {
        const response = await fetch(`/locales/${lang}.json`);
        translations[lang] = await response.json();
        applyTranslations(lang); // Update all elements with data-i18n attributes.
        applyDropdownTranslations(lang); // Update dropdown menu items.
        localStorage.setItem("language", lang);

        // Dispatch a custom event to signal that the language has changed
        document.dispatchEvent(new Event('languageChanged'));
    } catch (error) {
        console.error("Error loading translations:", error);
    }
}

// Applies translations to elements with data-i18n and data-i18n-placeholder attributes.
function applyTranslations(lang) {
    // Update elements with text content.
    document.querySelectorAll("[data-i18n]").forEach((element) => {
        const key = element.getAttribute("data-i18n");
        if (translations[lang] && translations[lang][key]) {
            element.textContent = translations[lang][key];
        }
    });

    // Update elements' placeholders.
    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
        const key = element.getAttribute("data-i18n-placeholder");
        if (translations[lang] && translations[lang][key]) {
            element.setAttribute("placeholder", translations[lang][key]);
        }
    });
}

// Applies translations to dropdown menu items inside elements with the class "dropdown-content".
function applyDropdownTranslations(lang) {
    document.querySelectorAll(".dropdown-content").forEach((dropdown) => {
        dropdown.querySelectorAll("[data-i18n]").forEach((item) => {
            const key = item.getAttribute("data-i18n");
            if (translations[lang] && translations[lang][key]) {
                item.textContent = translations[lang][key];
            }
        });
    });
}

function getTranslation(key) {
    const lang = localStorage.getItem("language") || "en";
    if (translations[lang] && translations[lang][key]) {
        return translations[lang][key];
    }
    return key;
}

// Expose the function globally
window.getTranslation = getTranslation;

// When the document is fully loaded, initialize the language select component and load translations.
document.addEventListener("DOMContentLoaded", () => {
    // Get the language selection dropdown element.
    const languageSelect = document.getElementById("languageSelect");
    // Retrieve the saved language from localStorage or default to "en".
    const savedLang = localStorage.getItem("language") || "en";

    // Set the select's value to the saved language
    languageSelect.value = savedLang;

    // (Re)initialize the Materialize select component
    const instance = M.FormSelect.getInstance(languageSelect);
    if (instance) {
        instance.destroy();
    }
    M.FormSelect.init(languageSelect);

    // Load translations using the saved language
    loadTranslations(savedLang);

    // Listen for changes
    languageSelect.addEventListener("change", (event) => {
        const selectedLang = event.target.value;
        loadTranslations(selectedLang);
    });
});
