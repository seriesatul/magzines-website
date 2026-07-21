export type PhotobookLayoutType =
  | "FULL_BLEED_1_PHOTO"
  | "GRID_3_PHOTO_BOTTOM_TEXT"
  | "GRID_5_PHOTO_DOUBLE_TEXT";

export type PhotobookPhoto = {
  slot: number;
  key?: string;
  url: string;
  name?: string;
  size?: number;
};

export type PhotobookTexts = Record<string, string>;

export type PhotobookPage = {
  pageNumber: number;
  layoutType: PhotobookLayoutType;
  texts: PhotobookTexts;
  photos: Array<PhotobookPhoto>;
};

export type PhotobookLayoutMetadata = Array<PhotobookPage>;

export type PhotobookCartPhoto = {
  key: string;
  url: string;
  name: string;
  size: number;
  mimeType?: string;
};

export type PhotobookCartItem = {
  id: string;
  productId: string;
  slug: string;
  name: string;
  pricePaise: number;
  imageUrl: string;
  imageAlt: string;
  quantity: number;
  customMessage?: string;
  uploadLaterOnWhatsApp?: boolean;
  photos?: Array<PhotobookCartPhoto>;
  photosCount?: number;
  layoutMetadata?: PhotobookLayoutMetadata;
};

export type PhotobookTemplateDefinition = {
  id: PhotobookLayoutType;
  name: string;
  shortName: string;
  slotCount: number;
  textFields: Array<{
    key: string;
    label: string;
    placeholder: string;
  }>;
};

export const PHOTOBOOK_TEMPLATES: Array<PhotobookTemplateDefinition> = [
  {
    id: "FULL_BLEED_1_PHOTO",
    name: "1 Photo Full-Bleed",
    shortName: "Full Bleed",
    slotCount: 1,
    textFields: [
      {
        key: "overlay",
        label: "Overlay text",
        placeholder: "A quiet summer afternoon"
      }
    ]
  },
  {
    id: "GRID_3_PHOTO_BOTTOM_TEXT",
    name: "3-Photo Asymmetric Grid",
    shortName: "Asymmetric 3",
    slotCount: 3,
    textFields: [
      {
        key: "subtitle",
        label: "Subtitle",
        placeholder: "The golden days"
      }
    ]
  },
  {
    id: "GRID_5_PHOTO_DOUBLE_TEXT",
    name: "5-Photo Collage",
    shortName: "Collage 5",
    slotCount: 5,
    textFields: [
      {
        key: "header1",
        label: "Header one",
        placeholder: "The ocean spreads"
      },
      {
        key: "header2",
        label: "Header two",
        placeholder: "Goa, India"
      }
    ]
  }
];

const DEFAULT_PHOTOBOOK_TEMPLATE = PHOTOBOOK_TEMPLATES[0] as PhotobookTemplateDefinition;

export function getPhotobookTemplate(
  layoutType: PhotobookLayoutType
): PhotobookTemplateDefinition {
  return (
    PHOTOBOOK_TEMPLATES.find((template) => template.id === layoutType) ??
    DEFAULT_PHOTOBOOK_TEMPLATE
  );
}

export function getPhotobookSlotCount(layoutType: PhotobookLayoutType): number {
  return getPhotobookTemplate(layoutType).slotCount;
}
