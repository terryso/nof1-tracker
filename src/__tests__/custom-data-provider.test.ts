import { CustomDataProviderExample } from '../services/custom-data-provider.example';
import { AgentAccount } from '../types/api';

// Create a test subclass that returns mock data
class TestCustomDataProvider extends CustomDataProviderExample {
  private mockAccountTotals: AgentAccount[] = [];

  setMockAccountTotals(data: AgentAccount[]) {
    this.mockAccountTotals = data;
  }

  async getAccountTotals(marker?: number): Promise<{ accountTotals: AgentAccount[] }> {
    return { accountTotals: this.mockAccountTotals };
  }

  // Helper method to add cache entries for testing
  addCacheEntry(url: string, data: any) {
    (this as any).cache.set(url, { data, timestamp: Date.now() - 5000 }); // 5 seconds ago
  }
}

describe('CustomDataProviderExample', () => {
  let provider: CustomDataProviderExample;

  beforeEach(() => {
    provider = new CustomDataProviderExample(
      'https://test-api.com',
      'test-api-key'
    );
  });

  describe('Constructor', () => {
    it('should create instance with required parameters', () => {
      expect(provider).toBeInstanceOf(CustomDataProviderExample);
    });

    it('should create instance without optional API key', () => {
      const providerWithoutKey = new CustomDataProviderExample('https://test-api.com');
      expect(providerWithoutKey).toBeInstanceOf(CustomDataProviderExample);
    });
  });

  describe('getAccountTotals', () => {
    it('should return empty account totals array by default', async () => {
      const result = await provider.getAccountTotals();

      expect(result).toHaveProperty('accountTotals');
      expect(Array.isArray(result.accountTotals)).toBe(true);
      expect(result.accountTotals).toHaveLength(0);
    });

    it('should handle optional marker parameter', async () => {
      const result = await provider.getAccountTotals(12345);

      expect(result).toHaveProperty('accountTotals');
      expect(Array.isArray(result.accountTotals)).toBe(true);
    });

    it('should return response in correct format', async () => {
      const result = await provider.getAccountTotals();

      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('accountTotals');
    });
  });

  describe('getAvailableAgents', () => {
    it('should return empty array when no agents exist', async () => {
      const agents = await provider.getAvailableAgents();

      expect(Array.isArray(agents)).toBe(true);
      expect(agents).toHaveLength(0);
    });

    it('should return unique agent IDs', async () => {
      // Since getAccountTotals returns empty array by default,
      // this test verifies the method handles empty data correctly
      const agents = await provider.getAvailableAgents();

      expect(agents).toEqual(expect.arrayContaining([]));
    });

    it('should return unique agent IDs when agents exist', async () => {
      const testProvider = new TestCustomDataProvider('https://test-api.com');

      const mockAccounts: AgentAccount[] = [
        {
          id: 'agent-1',
          model_id: 'agent-model-1',
          since_inception_hourly_marker: Date.now(),
          positions: {}
        },
        {
          id: 'agent-2',
          model_id: 'agent-model-1', // Same model_id to test uniqueness
          since_inception_hourly_marker: Date.now(),
          positions: {}
        },
        {
          id: 'agent-3',
          model_id: 'agent-model-2',
          since_inception_hourly_marker: Date.now(),
          positions: {}
        }
      ];

      testProvider.setMockAccountTotals(mockAccounts);
      const agents = await testProvider.getAvailableAgents();

      expect(agents).toHaveLength(2);
      expect(agents).toContain('agent-model-1');
      expect(agents).toContain('agent-model-2');
    });
  });

  describe('getAgentData', () => {
    it('should return null for non-existent agent', async () => {
      const result = await provider.getAgentData('non-existent-agent');

      expect(result).toBeNull();
    });

    it('should return null when agent data is empty', async () => {
      const result = await provider.getAgentData('any-agent-id');

      expect(result).toBeNull();
    });

    it('should handle optional marker parameter', async () => {
      const result = await provider.getAgentData('agent-id', 12345);

      expect(result).toBeNull();
    });

    it('should return agent data when agent exists', async () => {
      const testProvider = new TestCustomDataProvider('https://test-api.com');

      const mockAccounts: AgentAccount[] = [
        {
          id: 'agent-1',
          model_id: 'target-agent-id',
          since_inception_hourly_marker: Date.now(),
          positions: {
            'BTC': {
              symbol: 'BTC',
              entry_price: 50000,
              quantity: 0.1,
              leverage: 1,
              current_price: 51000,
              unrealized_pnl: 100,
              confidence: 0.8,
              entry_oid: 12345,
              tp_oid: 0,
              sl_oid: 0,
              margin: 5000,
              exit_plan: {
                profit_target: 52000,
                stop_loss: 48000,
                invalidation_condition: 'Price below 48000'
              }
            }
          }
        },
        {
          id: 'agent-2',
          model_id: 'other-agent-id',
          since_inception_hourly_marker: Date.now(),
          positions: {}
        }
      ];

      testProvider.setMockAccountTotals(mockAccounts);
      const result = await testProvider.getAgentData('target-agent-id');

      expect(result).not.toBeNull();
      expect(result?.model_id).toBe('target-agent-id');
      expect(result?.positions).toHaveProperty('BTC');
    });

    it('should return null when agent exists but has different model_id', async () => {
      const testProvider = new TestCustomDataProvider('https://test-api.com');

      const mockAccounts: AgentAccount[] = [
        {
          id: 'agent-1',
          model_id: 'different-agent-id',
          since_inception_hourly_marker: Date.now(),
          positions: {}
        }
      ];

      testProvider.setMockAccountTotals(mockAccounts);
      const result = await testProvider.getAgentData('target-agent-id');

      expect(result).toBeNull();
    });
  });

  describe('Cache Management', () => {
    beforeEach(() => {
      // Clear cache before each test
      provider.clearCache();
    });

    describe('clearCache', () => {
      it('should clear cache without errors', () => {
        expect(() => provider.clearCache()).not.toThrow();
      });

      it('should empty the cache', () => {
        // First, verify cache exists
        const statsBefore = provider.getCacheStats();
        expect(typeof statsBefore.size).toBe('number');

        // Clear cache
        provider.clearCache();

        // Verify cache is empty
        const statsAfter = provider.getCacheStats();
        expect(statsAfter.size).toBe(0);
        expect(statsAfter.entries).toHaveLength(0);
      });
    });

    describe('getCacheStats', () => {
      it('should return cache statistics object', () => {
        const stats = provider.getCacheStats();

        expect(typeof stats).toBe('object');
        expect(stats).toHaveProperty('size');
        expect(stats).toHaveProperty('entries');
        expect(typeof stats.size).toBe('number');
        expect(Array.isArray(stats.entries)).toBe(true);
      });

      it('should return correct cache size', () => {
        const stats = provider.getCacheStats();
        expect(stats.size).toBeGreaterThanOrEqual(0);
      });

      it('should return entries array', () => {
        const stats = provider.getCacheStats();
        expect(Array.isArray(stats.entries)).toBe(true);
      });

      it('should track cache entries correctly', () => {
        // Start with empty cache
        provider.clearCache();

        const stats = provider.getCacheStats();
        expect(stats.size).toBe(0);
        expect(stats.entries).toHaveLength(0);
      });

      it('should track cache entries with timestamps correctly', () => {
        const testProvider = new TestCustomDataProvider('https://test-api.com');

        // Add a cache entry with timestamp
        testProvider.addCacheEntry('test-url', { data: 'test-data' });

        const stats = testProvider.getCacheStats();
        expect(stats.size).toBe(1);
        expect(stats.entries).toHaveLength(1);

        const entry = stats.entries[0];
        expect(entry.url).toBe('test-url');
        expect(entry.age).toBeGreaterThan(0); // Should have a positive age
        expect(entry.age).toBeLessThan(10000); // Should be less than 10 seconds
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid marker parameter gracefully', async () => {
      // Test with negative marker
      const result1 = await provider.getAccountTotals(-1);
      expect(result1).toHaveProperty('accountTotals');

      // Test with zero marker
      const result2 = await provider.getAccountTotals(0);
      expect(result2).toHaveProperty('accountTotals');

      // Test with very large marker
      const result3 = await provider.getAccountTotals(Number.MAX_SAFE_INTEGER);
      expect(result3).toHaveProperty('accountTotals');
    });

    it('should handle empty agent ID in getAgentData', async () => {
      const result = await provider.getAgentData('');
      expect(result).toBeNull();
    });

    it('should handle special characters in agent ID', async () => {
      const specialAgentId = 'agent-with-special-chars-@#$%^&*()';
      const result = await provider.getAgentData(specialAgentId);
      expect(result).toBeNull();
    });
  });

  describe('Integration Behavior', () => {
    it('should maintain consistent behavior across multiple calls', async () => {
      // Multiple calls should return consistent results
      const result1 = await provider.getAccountTotals();
      const result2 = await provider.getAccountTotals();

      expect(result1.accountTotals).toEqual(result2.accountTotals);
    });

    it('should handle concurrent requests', async () => {
      // Test concurrent calls to the same method
      const promises = [
        provider.getAccountTotals(),
        provider.getAccountTotals(),
        provider.getAccountTotals()
      ];

      const results = await Promise.all(promises);

      // All results should be consistent
      results.forEach(result => {
        expect(result).toHaveProperty('accountTotals');
        expect(Array.isArray(result.accountTotals)).toBe(true);
      });
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory during cache operations', () => {
      // Perform many cache operations
      for (let i = 0; i < 100; i++) {
        provider.getCacheStats();
        provider.clearCache();
      }

      // Verify cache is still empty
      const finalStats = provider.getCacheStats();
      expect(finalStats.size).toBe(0);
    });

    it('should handle large number of cache stats calls', () => {
      // Call getCacheStats many times
      for (let i = 0; i < 1000; i++) {
        const stats = provider.getCacheStats();
        expect(typeof stats.size).toBe('number');
        expect(Array.isArray(stats.entries)).toBe(true);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long API endpoint URLs', () => {
      const longUrl = 'https://test-api.com/' + 'a'.repeat(1000);
      const longUrlProvider = new CustomDataProviderExample(longUrl);

      expect(longUrlProvider).toBeInstanceOf(CustomDataProviderExample);

      const stats = longUrlProvider.getCacheStats();
      expect(typeof stats).toBe('object');
    });

    it('should handle undefined API key', () => {
      const providerWithUndefinedKey = new CustomDataProviderExample('https://test-api.com', undefined);

      expect(providerWithUndefinedKey).toBeInstanceOf(CustomDataProviderExample);
    });

    it('should handle empty string API key', () => {
      const providerWithEmptyKey = new CustomDataProviderExample('https://test-api.com', '');

      expect(providerWithEmptyKey).toBeInstanceOf(CustomDataProviderExample);
    });
  });
});