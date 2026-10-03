import type {
  ContentFormat,
  Course,
  CoursePricing,
  Module,
  ProductType,
  TargetAudience,
} from '../types';

/** Keep public REST reads and SDK-backed reads on the same course shape. */
export function mapPublishedCourse(row: Record<string, unknown>): Course {
  const course: Record<string, unknown> = {};
  for (const key in row) {
    course[key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())] = row[key];
  }
  return {
    ...(course as unknown as Course),
    modules: (row.modules as Module[]) || [],
    pricing: row.pricing as CoursePricing,
    productType: (row.product_type as ProductType) || 'learndash',
    targetAudience: (row.target_audience as TargetAudience) || 'adults_teens',
    contentFormat: (row.content_format as ContentFormat) || 'interactive',
    teachingMaterialsPrice: row.teaching_materials_price as number | undefined,
    teachingMaterialsIncluded: (row.teaching_materials_included as boolean) || false,
    relatedMaterialsId: row.related_materials_id as string | undefined,
  };
}
