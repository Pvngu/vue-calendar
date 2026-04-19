import { getCurrentInstance } from "vue";
import en from "../locales/en.json";
import es from "../locales/es.json";

const dictionaries = {
    en,
    es,
};

const resolveLocale = (localeOverride) => {
    const fallbackLocale = "en";
    const explicitLocale = localeOverride || null;

    if (explicitLocale) {
        return explicitLocale.toLowerCase().slice(0, 2);
    }

    if (typeof document !== "undefined" && document.documentElement?.lang) {
        return document.documentElement.lang.toLowerCase().slice(0, 2);
    }

    if (typeof navigator !== "undefined" && navigator.language) {
        return navigator.language.toLowerCase().slice(0, 2);
    }

    return fallbackLocale;
};

const lookup = (source, key) => {
    if (!source || !key) return undefined;

    return key.split(".").reduce((current, part) => {
        if (current && Object.prototype.hasOwnProperty.call(current, part)) {
            return current[part];
        }
        return undefined;
    }, source);
};

const interpolate = (message, params) => {
    if (params == null) return message;

    if (Array.isArray(params)) {
        return params.reduce(
            (text, value, index) => text.replaceAll(`{${index}}`, String(value)),
            message,
        );
    }

    if (typeof params === "object") {
        return Object.entries(params).reduce(
            (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
            message,
        );
    }

    return message;
};

export function useTranslation(localeOverride) {
    getCurrentInstance();

    const locale = resolveLocale(localeOverride);
    const dictionary = dictionaries[locale] || en;

    const t = (key, params) => {
        const message = lookup(dictionary, key) ?? lookup(en, key) ?? key;
        return interpolate(String(message), params);
    };

    return { t, locale };
}
