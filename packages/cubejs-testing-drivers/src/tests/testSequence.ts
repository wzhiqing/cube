import { jest, expect, beforeAll, afterAll } from '@jest/globals';
import { Environment } from '../types/Environment';
import { PatchedDriver } from '../types/PatchedDriver';
import { CubejsServerCoreExposed } from '../types/CubejsServerCoreExposed';
import {
  getFixtures,
  getCreateQueries,
  getCore,
  getDriver,
  patchDriver,
  runEnvironment,
} from '../helpers';

export function testSequence(type: string): void {
  describe(`Sequence with the @cubejs-backend/${type}-driver`, () => {
    jest.setTimeout(60 * 5 * 1000);

    let core: CubejsServerCoreExposed;
    let source: PatchedDriver;
    let storage: PatchedDriver;
    let query: string[];
    let env: Environment;

    function execute(name: string, test: () => Promise<void>) {
      const fixtures = getFixtures(type);
      if (fixtures.skip && fixtures.skip.indexOf(name) >= 0) {
        it.skip(name, test);
      } else {
        it(name, test);
      }
    }

    beforeAll(async () => {
      env = await runEnvironment(type);
      process.env.CUBEJS_REFRESH_WORKER = 'true';
      process.env.CUBEJS_CUBESTORE_HOST = '127.0.0.1';
      process.env.CUBEJS_CUBESTORE_PORT = `${env.store.port}`;
      process.env.CUBEJS_CUBESTORE_USER = 'root';
      process.env.CUBEJS_CUBESTORE_PASS = 'root';
      process.env.CUBEJS_CACHE_AND_QUEUE_DRIVER = 'cubestore'; // memory
      if (env.data) {
        process.env.CUBEJS_DB_HOST = '127.0.0.1';
        process.env.CUBEJS_DB_PORT = `${env.data.port}`;
      }
      const drivers = await getDriver(type);
      source = drivers.source;
      storage = drivers.storage;
      query = getCreateQueries(type);
      await Promise.all(query.map(async (q) => {
        await source.query(q);
      }));
      patchDriver(source);
      patchDriver(storage);
      core = getCore(type, source, storage);
    });
  
    afterAll(async () => {
      await Promise.all(['ecommerce', 'customers', 'products'].map(async (t) => {
        await source.dropTable(t);
      }));
      await source.release();
      await storage.release();
      await core.shutdown();
      await env.stop();
    });

    beforeEach(() => {
      source.calls = [];
      storage.calls = [];
    });

    execute('for the Customers.RollingExternal', async () => {
      console.log('!!!!!!');

      const jobs: string[] = await core
        .getRefreshScheduler()
        .postBuildJobs(
          {
            authInfo: { tenantId: 'tenant1' },
            securityContext: { tenantId: 'tenant1' },
            requestId: 'XXX',
          },
          {
            timezones: ['UTC'],
            preAggregations: [{ id: 'Customers.RollingExternal' }],
            throwErrors: false,
          }
        );

      console.log(jobs);

      const selectors: {
        request: string;
        context: {securityContext: any};
        preagg: string;
        table: string;
        target: string;
        structure: string;
        content: string;
        updated: number;
        key: any[];
        status: string;
        timezone: string;
        dataSource: string;
      }[] = await core
        .getRefreshScheduler()
        .getCachedBuildJobs(
          {
            authInfo: { tenantId: 'tenant1' },
            securityContext: { tenantId: 'tenant1' },
            requestId: 'XXX',
          },
          jobs,
        );

      console.log(selectors);

      // expect([source.calls, storage.calls]).toMatchSnapshot();
    });

    // execute('for the Customers.RollingInternal', async () => {
    //   await core.getRefreshScheduler().buildPreAggregations(
    //     {
    //       authInfo: { tenantId: 'tenant1' },
    //       securityContext: { tenantId: 'tenant1' },
    //       requestId: 'XXX',
    //     },
    //     {
    //       timezones: ['UTC'],
    //       preAggregations: [{ id: 'Customers.RollingInternal' }],
    //       forceBuildPreAggregations: false,
    //       throwErrors: true,
    //     }
    //   );
    //   expect([source.calls, storage.calls]).toMatchSnapshot();
    // });

    // execute('for the ECommerce.SimpleAnalysisExternal', async () => {
    //   await core.getRefreshScheduler().buildPreAggregations(
    //     {
    //       authInfo: { tenantId: 'tenant1' },
    //       securityContext: { tenantId: 'tenant1' },
    //       requestId: 'XXX',
    //     },
    //     {
    //       timezones: ['UTC'],
    //       preAggregations: [{ id: 'ECommerce.SimpleAnalysisExternal' }],
    //       forceBuildPreAggregations: false,
    //       throwErrors: true,
    //     }
    //   );
    //   expect([source.calls, storage.calls]).toMatchSnapshot();
    // });

    // execute('for the ECommerce.SimpleAnalysisInternal', async () => {
    //   await core.getRefreshScheduler().buildPreAggregations(
    //     {
    //       authInfo: { tenantId: 'tenant1' },
    //       securityContext: { tenantId: 'tenant1' },
    //       requestId: 'XXX',
    //     },
    //     {
    //       timezones: ['UTC'],
    //       preAggregations: [{ id: 'ECommerce.SimpleAnalysisInternal' }],
    //       forceBuildPreAggregations: false,
    //       throwErrors: true,
    //     }
    //   );
    //   expect([source.calls, storage.calls]).toMatchSnapshot();
    // });

    // execute('for the ECommerce.TimeAnalysisExternal', async () => {
    //   await core.getRefreshScheduler().buildPreAggregations(
    //     {
    //       authInfo: { tenantId: 'tenant1' },
    //       securityContext: { tenantId: 'tenant1' },
    //       requestId: 'XXX',
    //     },
    //     {
    //       timezones: ['UTC'],
    //       preAggregations: [{ id: 'ECommerce.TimeAnalysisExternal' }],
    //       forceBuildPreAggregations: false,
    //       throwErrors: true,
    //     }
    //   );
    //   expect([source.calls, storage.calls]).toMatchSnapshot();
    // });

    // execute('for the ECommerce.TimeAnalysisInternal', async () => {
    //   await core.getRefreshScheduler().buildPreAggregations(
    //     {
    //       authInfo: { tenantId: 'tenant1' },
    //       securityContext: { tenantId: 'tenant1' },
    //       requestId: 'XXX',
    //     },
    //     {
    //       timezones: ['UTC'],
    //       preAggregations: [{ id: 'ECommerce.TimeAnalysisInternal' }],
    //       forceBuildPreAggregations: false,
    //       throwErrors: true,
    //     }
    //   );
    //   expect([source.calls, storage.calls]).toMatchSnapshot();
    // });
  });
}
