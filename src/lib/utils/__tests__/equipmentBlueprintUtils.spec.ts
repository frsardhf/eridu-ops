import { describe, expect, it } from 'vitest';
import type { ResourceProps } from '@/types/resource';
import type { Material } from '@/types/upgrade';
import { allocateEquipmentBlueprints, getGeneralBlueprintCost } from '../equipmentBlueprintUtils';

function resource(id: number, category: string, tier: number, owned = 0): ResourceProps {
  return {
    Id: id,
    Name: `resource-${id}`,
    Rarity: 'N',
    Category: category,
    Quality: 1,
    Icon: `icon-${id}`,
    Tags: [],
    Tier: tier,
    QuantityOwned: owned,
  };
}

function need(item: ResourceProps, quantity: number): Material {
  return { material: item, materialQuantity: quantity, type: 'equipments' };
}

describe('allocateEquipmentBlueprints', () => {
  it('uses normal blueprints before the matching general blueprint', () => {
    const normal = resource(1003, 'Hat', 4, 3);
    const general = resource(501000, 'Hat', 0, 10);
    const allocation = allocateEquipmentBlueprints([need(normal, 5)], {
      [normal.Id]: normal,
      [general.Id]: general,
    });

    expect(allocation.normalUsedById.get(normal.Id)).toBe(3);
    expect(allocation.generalUsedById.get(general.Id)).toBe(10);
    expect(allocation.remainingById.get(normal.Id)).toBe(0);
  });

  it('does not cover a deficit with another category general blueprint', () => {
    const normal = resource(2001, 'Gloves', 2);
    const hatGeneral = resource(501000, 'Hat', 0, 100);
    const allocation = allocateEquipmentBlueprints([need(normal, 4)], {
      [normal.Id]: normal,
      [hatGeneral.Id]: hatGeneral,
    });

    expect(allocation.generalUsedById.size).toBe(0);
    expect(allocation.remainingById.get(normal.Id)).toBe(-4);
  });

  it('spends limited general blueprints on lower tiers first', () => {
    const tier2 = resource(1001, 'Hat', 2);
    const tier4 = resource(1003, 'Hat', 4);
    const general = resource(501000, 'Hat', 0, 5);
    const allocation = allocateEquipmentBlueprints([need(tier4, 1), need(tier2, 2)], {
      [tier2.Id]: tier2,
      [tier4.Id]: tier4,
      [general.Id]: general,
    });

    expect(allocation.remainingById.get(tier2.Id)).toBe(0);
    expect(allocation.remainingById.get(tier4.Id)).toBe(-1);
    expect(allocation.generalUsedById.get(general.Id)).toBe(4);
  });
});

describe('getGeneralBlueprintCost', () => {
  it('uses the published tier exchange table', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(getGeneralBlueprintCost)).toEqual([
      1, 2, 3, 5, 7, 10, 15, 20, 30, 50,
    ]);
  });
});
