import { supabase } from '@/lib/supabase';

export const PROFESSIONAL_SIGNATURE_BUCKET = 'professional-signatures';
export const PROFESSIONAL_SIGNATURE_MAX_BYTES = 2 * 1024 * 1024;

interface UploadProfessionalSignatureInput {
  companyId: string;
  professionalId: string;
  file: File;
}

interface SaveProfessionalSignatureInput {
  companyId: string;
  professionalId: string;
  currentSignaturePath: string | null;
  signatureFile: File | null;
  removeCurrent: boolean;
}

export function buildProfessionalSignaturePath(companyId: string, professionalId: string): string {
  return `${companyId}/${professionalId}/signature.png`;
}

export function validateProfessionalSignatureFile(file: File): string | null {
  if (file.type !== 'image/png') {
    return 'A assinatura deve estar em formato PNG.';
  }

  if (file.size > PROFESSIONAL_SIGNATURE_MAX_BYTES) {
    return 'A assinatura deve ter no maximo 2MB.';
  }

  return null;
}

export async function uploadProfessionalSignature({
  companyId,
  professionalId,
  file,
}: UploadProfessionalSignatureInput): Promise<string> {
  const path = buildProfessionalSignaturePath(companyId, professionalId);

  const { data, error } = await supabase.storage
    .from(PROFESSIONAL_SIGNATURE_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: 'image/png',
      cacheControl: '3600',
    });

  if (error) throw error;
  return data.path;
}

export async function deleteProfessionalSignature(path: string): Promise<void> {
  const { error } = await supabase.storage.from(PROFESSIONAL_SIGNATURE_BUCKET).remove([path]);
  if (error) throw error;
}

export async function getProfessionalSignatureSignedUrl(
  path: string,
  expiresInSeconds: number = 60 * 10
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(PROFESSIONAL_SIGNATURE_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error) throw error;
  return data?.signedUrl ?? null;
}

export async function saveProfessionalSignature({
  companyId,
  professionalId,
  currentSignaturePath,
  signatureFile,
  removeCurrent,
}: SaveProfessionalSignatureInput): Promise<string | null> {
  let nextSignaturePath: string | null = removeCurrent ? null : currentSignaturePath;
  if (signatureFile) {
    nextSignaturePath = await uploadProfessionalSignature({
      companyId,
      professionalId,
      file: signatureFile,
    });
  }

  const { error: signatureUpdateError } = await supabase
    .from('professional')
    .update({ signature_path: nextSignaturePath } as any)
    .eq('company_id', companyId)
    .eq('id', professionalId);

  if (signatureUpdateError) throw signatureUpdateError;

  if (removeCurrent && currentSignaturePath && !signatureFile) {
    try {
      await deleteProfessionalSignature(currentSignaturePath);
    } catch (deleteError) {
      console.error('Error deleting old professional signature file:', deleteError);
    }
  }

  return nextSignaturePath;
}
