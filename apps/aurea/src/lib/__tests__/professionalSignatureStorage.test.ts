import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveProfessionalSignature } from '@/lib/professionalSignatureStorage'

const { mockStorageFrom, mockUpload, mockRemove, mockTableFrom } = vi.hoisted(() => ({
  mockStorageFrom: vi.fn(),
  mockUpload: vi.fn(),
  mockRemove: vi.fn(),
  mockTableFrom: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: mockStorageFrom,
    },
    from: mockTableFrom,
  },
}))

function buildProfessionalUpdateChain(result: { error: unknown }) {
  const secondEq = vi.fn().mockResolvedValue(result)
  const firstEq = vi.fn().mockReturnValue({ eq: secondEq })
  const update = vi.fn().mockReturnValue({ eq: firstEq })
  return { update, firstEq, secondEq }
}

describe('professionalSignatureStorage.saveProfessionalSignature', () => {
  beforeEach(() => {
    mockStorageFrom.mockReset()
    mockUpload.mockReset()
    mockRemove.mockReset()
    mockTableFrom.mockReset()

    mockStorageFrom.mockReturnValue({
      upload: mockUpload,
      remove: mockRemove,
      createSignedUrl: vi.fn(),
    })
  })

  it('uploads PNG signature and persists signature_path on professional', async () => {
    const companyId = '2c9ec285-379a-4ec1-990e-9e80266cbead'
    const professionalId = '79b08b9c-d8fd-4e13-bc02-c4add3801cf1'
    const expectedPath = `${companyId}/${professionalId}/signature.png`
    const signatureFile = new File(['png-data'], 'assinatura.png', { type: 'image/png' })
    const updateChain = buildProfessionalUpdateChain({ error: null })

    mockUpload.mockResolvedValue({
      data: { path: expectedPath },
      error: null,
    })
    mockTableFrom.mockReturnValue({
      update: updateChain.update,
    })

    const savedPath = await saveProfessionalSignature({
      companyId,
      professionalId,
      currentSignaturePath: null,
      signatureFile,
      removeCurrent: false,
    })

    expect(mockStorageFrom).toHaveBeenCalledWith('professional-signatures')
    expect(mockUpload).toHaveBeenCalledWith(
      expectedPath,
      signatureFile,
      expect.objectContaining({
        upsert: true,
        contentType: 'image/png',
      })
    )
    expect(mockTableFrom).toHaveBeenCalledWith('professional')
    expect(updateChain.update).toHaveBeenCalledWith({ signature_path: expectedPath })
    expect(updateChain.firstEq).toHaveBeenCalledWith('company_id', companyId)
    expect(updateChain.secondEq).toHaveBeenCalledWith('id', professionalId)
    expect(savedPath).toBe(expectedPath)
  })

  it('removes existing signature when requested and saves signature_path null', async () => {
    const companyId = '2c9ec285-379a-4ec1-990e-9e80266cbead'
    const professionalId = '79b08b9c-d8fd-4e13-bc02-c4add3801cf1'
    const currentSignaturePath = `${companyId}/${professionalId}/signature.png`
    const updateChain = buildProfessionalUpdateChain({ error: null })

    mockRemove.mockResolvedValue({
      error: null,
    })
    mockTableFrom.mockReturnValue({
      update: updateChain.update,
    })

    const savedPath = await saveProfessionalSignature({
      companyId,
      professionalId,
      currentSignaturePath,
      signatureFile: null,
      removeCurrent: true,
    })

    expect(mockUpload).not.toHaveBeenCalled()
    expect(updateChain.update).toHaveBeenCalledWith({ signature_path: null })
    expect(mockRemove).toHaveBeenCalledWith([currentSignaturePath])
    expect(savedPath).toBeNull()
  })
})
