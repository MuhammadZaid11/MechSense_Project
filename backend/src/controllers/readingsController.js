export function createReadingsController(readingService) {
  return {
    async ingestReading(req, res) {
      const result = await readingService.ingestReading(req.params.id, req.body || {});
      res.status(201).json({ data: result });
    },

    async listReadings(req, res) {
      const readings = await readingService.listReadings(req.params.id, req.query.limit);
      res.status(200).json({ data: readings });
    },

    async listLatestReadings(_req, res) {
      const readings = await readingService.listLatestReadings();
      res.status(200).json({ data: readings });
    },
  };
}
