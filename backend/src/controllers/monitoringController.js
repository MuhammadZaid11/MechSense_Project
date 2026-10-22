export function createMonitoringController(monitoringService, simulatorControls) {
  return {
    async getSnapshot(_req, res) {
      const snapshot = await monitoringService.getSnapshot();
      res.status(200).json({ data: snapshot });
    },

    async getSimulator(_req, res) {
      res.status(200).json({ data: simulatorControls.getStatus() });
    },

    async startSimulator(_req, res) {
      const status = simulatorControls.start();
      res.status(200).json({ data: status });
    },

    async stopSimulator(_req, res) {
      const status = simulatorControls.stop();
      res.status(200).json({ data: status });
    },
  };
}
