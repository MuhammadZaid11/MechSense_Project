function mapMachine(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    machineType: row.machine_type,
    location: row.location,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createMachineService({ query }) {
  return {
    async listMachines() {
      const result = await query(
        `
          SELECT id, code, name, machine_type, location, status, created_at, updated_at
          FROM machines
          ORDER BY code ASC
        `,
      );

      return result.rows.map(mapMachine);
    },

    async getMachineById(id) {
      const result = await query(
        `
          SELECT id, code, name, machine_type, location, status, created_at, updated_at
          FROM machines
          WHERE id = $1
        `,
        [id],
      );

      return result.rows[0] ? mapMachine(result.rows[0]) : null;
    },
  };
}
