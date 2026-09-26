export const buildQueryString = (params = "") => {
  const paramKeys = [];

  Object.keys(params).forEach((key) => {
    if (params[key]) {
      paramKeys.push(`${key}=${params[key]}`);
    }
  });

  // Construct the query string (if any parameters exist)
  return paramKeys.length ? `?${paramKeys.join("&")}` : "";
};

export const formatDate = (dateString) => {
  if (!dateString) return "";

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const pad = (n) => String(n).padStart(2, "0");

  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();

  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

export default function IgnoreMe() { return null; }
