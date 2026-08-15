import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';

const mockRecipeCreate = jest.fn();
const mockRecipeFindByPk = jest.fn();
const mockSpeciesCreate = jest.fn();
const mockSpeciesFindByPk = jest.fn();
const mockLogAudit = jest.fn();

jest.unstable_mockModule('../models/index.js', () => ({
  Recipe: {
    create: mockRecipeCreate,
    findByPk: mockRecipeFindByPk,
    findAll: jest.fn(),
  },
  SpeciesProfile: {
    create: mockSpeciesCreate,
    findByPk: mockSpeciesFindByPk,
    findAll: jest.fn(),
  },
  MedicinalProperty: {},
  BioactiveCompound: {},
}));

jest.unstable_mockModule('../services/auditService.js', () => ({
  logAudit: mockLogAudit,
}));

jest.unstable_mockModule('../middlewares/rbac.js', () => ({
  requireMinRole: () => (req, res, next) => next(),
  requireRole: () => (req, res, next) => next(),
  getRoleLevel: () => 100,
}));

const { default: recipesRouter } = await import('../routes/recipes.js');
const { default: speciesRouter } = await import('../routes/species.js');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.user = { id: 'u1', role: 'ADMIN' };
    req.tenant = { userId: 'u1' };
    next();
  });
  app.use(recipesRouter);
  app.use('/species', speciesRouter);
  return app;
}

describe('recipes whitelist (ISSUE-025)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /recipes passes only whitelisted fields + userId to Recipe.create', async () => {
    mockRecipeCreate.mockResolvedValue({ id: 'r1' });
    const app = buildApp();
    const res = await request(app).post('/recipes').send({
      name: 'X',
      species: 'Y',
      isAdmin: true,
      hackerField: 'boom',
    });

    expect(res.status).toBe(201);
    expect(mockRecipeCreate).toHaveBeenCalledWith({
      name: 'X',
      species: 'Y',
      userId: 'u1',
    });
    expect(mockRecipeCreate.mock.calls[0][0].hackerField).toBeUndefined();
    expect(mockRecipeCreate.mock.calls[0][0].isAdmin).toBeUndefined();
  });

  it('PUT /recipes/:id passes only whitelisted fields to recipe.update', async () => {
    const update = jest.fn().mockResolvedValue();
    mockRecipeFindByPk.mockResolvedValue({ id: 'r1', userId: 'u1', update });
    const app = buildApp();
    const res = await request(app).put('/recipes/r1').send({
      name: 'X',
      species: 'Y',
      isAdmin: true,
      hackerField: 'boom',
    });

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ name: 'X', species: 'Y' });
  });

  it('PUT /recipes/:id with no whitelisted fields returns 400', async () => {
    const update = jest.fn().mockResolvedValue();
    mockRecipeFindByPk.mockResolvedValue({ id: 'r1', userId: 'u1', update });
    const app = buildApp();
    const res = await request(app).put('/recipes/r1').send({ hackerField: 'boom' });

    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('species whitelist (ISSUE-025)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /species passes only whitelisted fields to SpeciesProfile.create', async () => {
    mockSpeciesCreate.mockResolvedValue({ id: 's1' });
    const app = buildApp();
    const res = await request(app).post('/species').send({
      name: 'X',
      scientificName: 'S',
      adapterClass: 'A',
      isAdmin: true,
      hackerField: 'boom',
    });

    expect(res.status).toBe(201);
    expect(mockSpeciesCreate).toHaveBeenCalledWith({
      name: 'X',
      scientificName: 'S',
      adapterClass: 'A',
    });
    expect(mockSpeciesCreate.mock.calls[0][0].hackerField).toBeUndefined();
    expect(mockSpeciesCreate.mock.calls[0][0].isAdmin).toBeUndefined();
  });

  it('PUT /species/:id passes only whitelisted fields to species.update', async () => {
    const update = jest.fn().mockResolvedValue();
    mockSpeciesFindByPk.mockResolvedValue({ id: 's1', update });
    const app = buildApp();
    const res = await request(app).put('/species/s1').send({
      name: 'X',
      scientificName: 'S',
      adapterClass: 'A',
      isAdmin: true,
      hackerField: 'boom',
    });

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      name: 'X',
      scientificName: 'S',
      adapterClass: 'A',
    });
  });

  it('PUT /species/:id with no whitelisted fields returns 400', async () => {
    const update = jest.fn().mockResolvedValue();
    mockSpeciesFindByPk.mockResolvedValue({ id: 's1', update });
    const app = buildApp();
    const res = await request(app).put('/species/s1').send({ hackerField: 'boom' });

    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });
});
