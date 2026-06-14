/**
 * Authentication Middleware — Mush2 Backend
 * 
 * Middleware para validación de JWT en endpoints protegidos.
 * Soporta dos modos:
 * 1. authenticate() — Requiere token válido (401 si falta/inválido)
 * 2. optionalAuth() — Intenta parsear token, pero permite continuar si inválido
 * 
 * Token format: `Bearer <jwt>`
 * Algoritmo: HS256 (HMAC con JWT_SECRET)
 * 
 * @module middlewares/auth
 * @see {@link ../config/env.js}
 */

import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Middleware de autenticación requerida.
 * 
 * Extrae JWT del header Authorization y verifica su validez.
 * Si es válido, asigna decoded token a req.user.
 * 
 * @function authenticate
 * @param {Object} req - Express request object
 * @param {string} req.headers.authorization - "Bearer <token>"
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * 
 * @returns {void}
 * 
 * @throws {Error} 401 si token falta, está inválido o expirado
 * 
 * @example
 * // En routes/admin.js
 * router.get('/users', authenticate, (req, res) => {
 *   console.log(req.user.id, req.user.role);
 * });
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
}

/**
 * Middleware de autenticación opcional.
 * 
 * Intenta extraer y verificar JWT.
 * Si es válido, asigna a req.user.
 * Si no existe o es inválido, deja req.user = null y continúa.
 * 
 * Útil para endpoints que pueden servir contenido público + privado.
 * 
 * @function optionalAuth
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * 
 * @returns {void}
 * 
 * @example
 * // En routes/api.js (listado de recetas público, pero muestra favoritos si autenticado)
 * router.get('/recipes', optionalAuth, (req, res) => {
 *   const recipes = await getRecipes();
 *   if (req.user) {
 *     recipes = recipes.map(r => ({ ...r, isFavorite: r.userId === req.user.id }));
 *   }
 *   res.json(recipes);
 * });
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, env.JWT_SECRET);
  } catch {
    req.user = null;
  }
  next();
}

