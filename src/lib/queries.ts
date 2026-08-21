// ── Property Queries ──

export const allPropertiesQuery = `
  *[_type == "property" && status in ["for-rent", "let-agreed", "let"]] | order(_createdAt desc) {
    _id,
    title,
    "slug": slug.current,
    status,
    propertyType,
    price,
    priceQualifier,
    rentPerMonth,
    rentPeriod,
    furnished,
    minTermMonths,
    availableFrom,
    depositAmount,
    bedrooms,
    bathrooms,
    receptionRooms,
    sqft,
    town,
    postcode,
    features,
    epc,
    location,
    "thumbnail": images[0]{
      asset->{url, metadata{dimensions, lqip}},
      alt
    }
  }
`;

export const propertyBySlugQuery = `
  *[_type == "property" && slug.current == $slug && status in ["for-rent", "let-agreed", "let"]][0] {
    _id,
    title,
    "slug": slug.current,
    status,
    propertyType,
    price,
    priceQualifier,
    rentPerMonth,
    rentPeriod,
    furnished,
    minTermMonths,
    availableFrom,
    depositAmount,
    bedrooms,
    bathrooms,
    receptionRooms,
    sqft,
    tenure,
    epc,
    councilTaxBand,
    description,
    features,
    addressLine1,
    addressLine2,
    town,
    county,
    postcode,
    location,
    images[]{
      asset->{url, metadata{dimensions, lqip}},
      alt,
      caption
    },
    floorplans[]{
      label,
      image{asset->{url}}
    },
    virtualTourUrl,
    videos[]{
      title,
      videoType,
      videoUrl,
      "videoFileUrl": videoFile.asset->url,
      thumbnail{asset->{url}}
    },
    metaTitle,
    metaDescription,
    branch->{
      name,
      phone,
      email,
      logo{asset->{url}},
      address
    },
    agent->{
      name,
      "slug": slug.current,
      role,
      photo,
      phone,
      email,
      whatsapp,
      socialLinks[]{platform, url}
    }
  }
`;

export const propertiesByAreaQuery = `
  *[_type == "property" && town == $area && status in ["for-rent", "let-agreed", "let"]] | order(coalesce(rentPerMonth, 0) desc) {
    _id,
    title,
    "slug": slug.current,
    status,
    propertyType,
    price,
    priceQualifier,
    rentPerMonth,
    rentPeriod,
    furnished,
    bedrooms,
    bathrooms,
    sqft,
    town,
    postcode,
    "thumbnail": images[0]{
      asset->{url, metadata{dimensions, lqip}},
      alt
    }
  }
`;

export const featuredPropertiesQuery = `
  *[_type == "property" && status in ["for-rent", "let-agreed", "let"]] | order(_createdAt desc) [0...6] {
    _id,
    title,
    "slug": slug.current,
    status,
    propertyType,
    price,
    priceQualifier,
    rentPerMonth,
    rentPeriod,
    furnished,
    bedrooms,
    bathrooms,
    sqft,
    town,
    "thumbnail": images[0]{
      asset->{url, metadata{dimensions, lqip}},
      alt
    }
  }
`;

// ── Area Queries ──

export const allAreasQuery = `
  *[_type == "area"] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    heroImage{asset->{url, metadata{lqip}}},
    metaTitle,
    metaDescription
  }
`;

export const areaBySlugQuery = `
  *[_type == "area" && slug.current == $slug][0] {
    _id,
    name,
    "slug": slug.current,
    description,
    heroImage{asset->{url, metadata{dimensions, lqip}}},
    metaTitle,
    metaDescription
  }
`;

// ── Page Queries ──

export const pageBySlugQuery = `
  *[_type == "page" && slug.current == $slug][0] {
    _id,
    title,
    "slug": slug.current,
    body,
    metaTitle,
    metaDescription,
    ogImage{asset->{url}}
  }
`;

// ── Site Settings ──

export const siteSettingsQuery = `
  *[_type == "siteSettings"][0] {
    siteName,
    siteTagline,
    logo{asset->{url}},
    logoDark{asset->{url}},
    favicon{asset->{url}},
    primaryColour,
    secondaryColour,
    phone,
    email,
    footerText,
    socialLinks[]{platform, url},
    defaultMetaTitle,
    defaultMetaDescription,
    ogImage{asset->{url}},
    googleAnalyticsId
  }
`;

// ── Utility: Get all unique towns (for filter dropdowns) ──

export const allTownsQuery = `
  array::unique(*[_type == "property" && status in ["for-rent", "let-agreed", "let"]].town)
`;

// ── Utility: Get all unique property types ──

export const allPropertyTypesQuery = `
  array::unique(*[_type == "property" && status in ["for-rent", "let-agreed", "let"]].propertyType)
`;

// ── Agent Queries ──

export const allAgentsQuery = `
  *[_type == "agent" && active == true] | order(order asc, name asc) {
    _id,
    name,
    "slug": slug.current,
    role,
    photo,
    phone,
    email,
    specialisms,
    socialLinks[]{platform, url},
    branch->{name, "slug": slug.current}
  }
`;

export const agentBySlugQuery = `
  *[_type == "agent" && slug.current == $slug && active == true][0] {
    _id,
    name,
    "slug": slug.current,
    role,
    photo,
    bio,
    phone,
    email,
    whatsapp,
    specialisms,
    socialLinks[]{platform, url},
    branch->{name, phone, email, address},
    metaTitle,
    metaDescription
  }
`;

export const propertiesByAgentQuery = `
  *[_type == "property" && agent._ref == $agentId && status in ["for-rent", "let-agreed", "let"]] | order(_createdAt desc) {
    _id,
    title,
    "slug": slug.current,
    status,
    propertyType,
    price,
    priceQualifier,
    rentPerMonth,
    rentPeriod,
    furnished,
    bedrooms,
    bathrooms,
    sqft,
    town,
    postcode,
    location,
    "thumbnail": images[0]{
      asset->{url, metadata{dimensions, lqip}},
      alt
    }
  }
`;

// ── Blog Post Queries ──

export const allPostsQuery = `
  *[_type == "post" && defined(publishedAt) && publishedAt <= now()] | order(publishedAt desc) {
    _id,
    title,
    "slug": slug.current,
    excerpt,
    publishedAt,
    readTime,
    "coverImage": coverImage{
      asset->{url, metadata{dimensions, lqip}},
      alt
    },
    author->{name, "slug": slug.current, photo}
  }
`;

export const postBySlugQuery = `
  *[_type == "post" && slug.current == $slug && defined(publishedAt) && publishedAt <= now()][0] {
    _id,
    title,
    "slug": slug.current,
    excerpt,
    publishedAt,
    readTime,
    body,
    "coverImage": coverImage{
      asset->{url, metadata{dimensions, lqip}},
      alt
    },
    "ogImage": coalesce(
      ogImage{asset->{url}},
      coverImage{asset->{url}}
    ),
    metaTitle,
    metaDescription,
    author->{
      name,
      "slug": slug.current,
      role,
      photo{asset->{url}}
    }
  }
`;
