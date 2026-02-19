import { defineNavigationPageSuite, resetCadastrosPageMocks } from '../cadastrosPages.shared';

import { beforeEach, describe } from 'vitest';

beforeEach(() => {
  resetCadastrosPageMocks();
});

describe('Cadastro: pacientes', () => {
  defineNavigationPageSuite('pacientes');
});
