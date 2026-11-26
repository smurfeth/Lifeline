// js/donorBadge.js
export function getDonorMilestone(completedCount) {
  const count = Number(completedCount) || 0;

  if (count >= 26) {
    return {
      tier: 'Diamond Donor',
      subtitle: `${count} successful donations completed — Top Lifetime Achiever!`,
      progressText: `${count} / 26+`,
      percent: 100,
      accentColor: '#0284C7', // Diamond Blue
      bgColor: '#E0F2FE'
    };
  }

  if (count >= 13) {
    const remaining = 26 - count;
    return {
      tier: 'Platinum Donor',
      subtitle: `${remaining} more successful donation${remaining === 1 ? '' : 's'} toward Diamond Donor.`,
      progressText: `${count} / 26`,
      percent: Math.round((count / 26) * 100),
      accentColor: '#7C3AED', // Platinum Violet
      bgColor: '#EDE9FE'
    };
  }

  if (count >= 7) {
    const remaining = 13 - count;
    return {
      tier: 'Gold Donor',
      subtitle: `${remaining} more successful donation${remaining === 1 ? '' : 's'} toward Platinum Donor.`,
      progressText: `${count} / 13`,
      percent: Math.round((count / 13) * 100),
      accentColor: '#D97706', // Gold Amber
      bgColor: '#FEF3C7'
    };
  }

  if (count >= 4) {
    const remaining = 7 - count;
    return {
      tier: 'Silver Donor',
      subtitle: `${remaining} more successful donation${remaining === 1 ? '' : 's'} toward Gold Donor.`,
      progressText: `${count} / 7`,
      percent: Math.round((count / 7) * 100),
      accentColor: '#475569', // Silver Slate
      bgColor: '#F1F5F9'
    };
  }

  if (count >= 1) {
    const remaining = 4 - count;
    return {
      tier: 'Bronze Donor',
      subtitle: `${remaining} more successful donation${remaining === 1 ? '' : 's'} toward Silver Donor.`,
      progressText: `${count} / 4`,
      percent: Math.round((count / 4) * 100),
      accentColor: '#B45309', // Bronze Copper
      bgColor: '#FFEDD5'
    };
  }

  // 0 completed donations
  return {
    tier: 'New Voluntary Donor',
    subtitle: '0/1 successful donations toward Bronze Donor.',
    progressText: '0 / 1',
    percent: 0,
    accentColor: '#DC2626', // Lifeline Red
    bgColor: '#FEE2E2'
  };
}