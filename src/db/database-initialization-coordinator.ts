const initializationQueues = new Map<string, Promise<void>>();

/** Serializes repeated SQLiteProvider onInit calls for the same database. */
export function runSerializedDatabaseInitialization(
  databaseName: string,
  task: () => Promise<void>,
) {
  const previous = initializationQueues.get(databaseName) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(task);
  initializationQueues.set(databaseName, current);

  return current.finally(() => {
    if (initializationQueues.get(databaseName) === current) {
      initializationQueues.delete(databaseName);
    }
  });
}
