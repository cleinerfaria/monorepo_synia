import { defineNavigationPageSuite, resetCadastrosPageMocks } from '../cadastrosPages.shared';

import { beforeEach, describe } from 'vitest';

beforeEach(() => {
  resetCadastrosPageMocks();
});

describe('Cadastro: profissionais', () => {
  defineNavigationPageSuite('profissionais');
});
