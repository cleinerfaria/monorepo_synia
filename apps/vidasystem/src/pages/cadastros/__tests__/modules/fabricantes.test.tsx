import { defineModalPageSuite, resetCadastrosPageMocks } from '../cadastrosPages.shared';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import ManufacturersPage from '@/pages/cadastros/ManufacturersPage';
import { getCadastrosPageMocks, renderPage, submitModal } from '../cadastrosPages.shared';

beforeEach(() => {
  resetCadastrosPageMocks();
});

describe('Cadastro: fabricantes', () => {
  defineModalPageSuite('fabricantes');

  it('normaliza razão social e nome fantasia para maiúsculas', async () => {
    const user = userEvent.setup();
    renderPage(ManufacturersPage);

    await user.click(screen.getByRole('button', { name: /novo fabricante/i }));

    const legalNameInput = screen.getByLabelText('Razão Social');
    const tradeNameInput = screen.getByLabelText('Nome Fantasia');

    await user.type(legalNameInput, 'Fabricante teste');
    await user.type(tradeNameInput, 'Nome fantasia');

    expect(legalNameInput).toHaveValue('FABRICANTE TESTE');
    expect(tradeNameInput).toHaveValue('NOME FANTASIA');

    await submitModal('Novo Fabricante');

    await waitFor(() => {
      expect(getCadastrosPageMocks().createManufacturer).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'FABRICANTE TESTE',
          trade_name: 'NOME FANTASIA',
        })
      );
    });
  });
});
