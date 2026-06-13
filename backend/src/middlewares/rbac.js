const ROLE_HIERARCHY = {
  SUPER_ADMIN: 100,
  ADMIN: 80,
  OPERATOR: 50,
  VIEWER: 10,
};

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticación requerida' });
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const requiredLevel = Math.max(...roles.map(r => ROLE_HIERARCHY[r] || 0));

    if (userLevel < requiredLevel) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    next();
  };
}

export function requireMinRole(minRole) {
  const minLevel = ROLE_HIERARCHY[minRole] || 0;
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticación requerida' });
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    if (userLevel < minLevel) {
      return res.status(403).json({ error: `Se requiere rol ${minRole} o superior` });
    }

    next();
  };
}

export function getRoleLevel(role) {
  return ROLE_HIERARCHY[role] || 0;
}
