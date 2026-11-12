import { Pool, type PoolClient, type PoolConfig } from "pg";

type ConnectCallback = (err: Error | undefined, client: PoolClient | undefined, done: (release?: unknown) => void) => void;

/**
 * Pool de conexiones con UN reintento al ADQUIRIR la conexión.
 *
 * Seguridad del reintento: `connect()` solo entrega una conexión del pool (o abre
 * una nueva); si falla, todavía no se envió ninguna consulta, así que repetirlo no
 * puede duplicar ni alterar datos. El reintento NO cubre nada posterior: un error
 * dentro de una consulta o de una transacción interactiva ($transaction) se propaga
 * tal cual —la transacción se hace una sola vez, con la conexión que ya tiene— y
 * por eso tampoco "reabre" transacciones a medias.
 *
 * pg-pool adquiere la conexión de dos maneras: `pool.connect()` (promesa, la usa
 * Prisma para abrir transacciones) y `pool.connect(callback)` (la usa
 * `pool.query()` internamente, o sea las consultas sueltas). Se cubren las dos.
 */
export class PoolConReintento extends Pool {
  connect(): Promise<PoolClient>;
  connect(callback: ConnectCallback): void;
  connect(callback?: ConnectCallback): Promise<PoolClient> | void {
    if (!callback) {
      return super.connect().catch(() => super.connect());
    }
    let reintentado = false;
    const intentar = (): void => {
      super.connect((err, client, done) => {
        if (err && !reintentado) {
          reintentado = true;
          intentar();
          return;
        }
        callback(err, client, done);
      });
    };
    intentar();
  }
}

/**
 * Tiempo máximo para conseguir una conexión: 10 s en producción (falla rápido en
 * serverless) y 30 s en desarrollo, donde la máquina compila y puede tardar más.
 */
export function tiempoLimiteConexionMs(): number {
  return process.env.NODE_ENV === "production" ? 10_000 : 30_000;
}

export function crearPool(connectionString: string | undefined): PoolConReintento {
  const config: PoolConfig = {
    connectionString,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: tiempoLimiteConexionMs(),
    keepAlive: true,
  };
  return new PoolConReintento(config);
}
