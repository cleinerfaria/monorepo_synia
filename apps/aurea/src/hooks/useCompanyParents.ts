export {
  useCompanyUnits as useCompanyParents,
  useCompanyUnit as useCompanyParent,
  useCreateCompanyUnit as useCreateCompanyParent,
  useUpdateCompanyUnit as useUpdateCompanyParent,
} from '@/hooks/useCompanyUnits';

export type {
  CompanyUnit as CompanyParent,
  CreateCompanyUnitInput as CreateCompanyParentInput,
  UpdateCompanyUnitInput as UpdateCompanyParentInput,
} from '@/hooks/useCompanyUnits';
