import { useEffect } from "react";

export default function Seo({
  title,
  description,
  path = "/",
  image = "/og-livora.jpg",
}) {
  useEffect(() => {
    const siteUrl = "https://www.livoralcr.com";
    const url = `${siteUrl}${path}`;

    const imageUrl = image
      ? image.startsWith("http")
        ? image
        : `${siteUrl}${image}`
      : null;

    document.title = title;

    const tags = {
      description: {
        attribute: "name",
        content: description,
      },
      "og:title": {
        attribute: "property",
        content: title,
      },
      "og:description": {
        attribute: "property",
        content: description,
      },
      "og:type": {
        attribute: "property",
        content: "website",
      },
      "og:site_name": {
        attribute: "property",
        content: "LIVORA",
      },
      "og:url": {
        attribute: "property",
        content: url,
      },
      "og:image:alt": {
        attribute: "property",
        content: "LIVORA interior design project",
      },
      "twitter:card": {
        attribute: "name",
        content: "summary_large_image",
      },
      "twitter:title": {
        attribute: "name",
        content: title,
      },
      "twitter:description": {
        attribute: "name",
        content: description,
      },
      "twitter:image:alt": {
        attribute: "name",
        content: "LIVORA interior design project",
      },
    };

    Object.entries(tags).forEach(([name, data]) => {
      let tag = document.querySelector(
        `meta[${data.attribute}="${name}"]`
      );

      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(data.attribute, name);
        document.head.appendChild(tag);
      }

      tag.setAttribute("content", data.content);
    });

    const imageMetaTags = [
      {
        name: "og:image",
        attribute: "property",
      },
      {
        name: "twitter:image",
        attribute: "name",
      },
    ];

    imageMetaTags.forEach(({ name, attribute }) => {
      let tag = document.querySelector(
        `meta[${attribute}="${name}"]`
      );

      if (imageUrl) {
        if (!tag) {
          tag = document.createElement("meta");
          tag.setAttribute(attribute, name);
          document.head.appendChild(tag);
        }

        tag.setAttribute("content", imageUrl);
      } else if (tag) {
        tag.remove();
      }
    });

    let canonical = document.querySelector(
      'link[rel="canonical"]'
    );

    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }

    canonical.setAttribute("href", url);
  }, [title, description, path, image]);

  return null;
}