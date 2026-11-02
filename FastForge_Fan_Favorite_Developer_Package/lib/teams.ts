// Edit display names here. Keep IDs unchanged to preserve each team's votes.
// Visitors can vote for these teams; renaming is only done in the site source.
export const TEAMS = [
  { id: 1, name: 'Team 1' },
  { id: 2, name: 'Team 2' },
  { id: 3, name: 'Team 3' },
];
export function teamName(id: number) { return TEAMS.find(team=>team.id===id)?.name ?? 'Team'; }
