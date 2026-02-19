import { defineModalPageSuite, resetCadastrosPageMocks } from '../cadastrosPages.shared';

import { beforeEach, describe } from 'vitest';

beforeEach(() => {
  resetCadastrosPageMocks();
});

describe('Cadastro: procedimentos', () => {
  defineModalPageSuite('procedimentos');
});
