import { execSync } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'

export interface CommitInfo {
  hash: string
  timestamp: Date
  message?: string
  author?: string
}

export interface CommitComparison {
  currentCommit: CommitInfo
  lastScanCommit?: CommitInfo
  hasChanges: boolean
  daysSinceLastScan?: number
  commitsAhead?: number
}

/**
 * Get the current commit hash from a local git repository
 */
export function getCurrentCommitHash(repoPath: string): string | null {
  try {
    if (!existsSync(path.join(repoPath, '.git'))) {
      console.warn(`No .git directory found at ${repoPath}`)
      return null
    }

    const hash = execSync('git rev-parse HEAD', {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim()

    return hash
  } catch (error) {
    console.error('Error getting commit hash:', error)
    return null
  }
}

/**
 * Get commit information including hash, timestamp, and message
 */
export function getCommitInfo(repoPath: string, commitHash?: string): CommitInfo | null {
  try {
    if (!existsSync(path.join(repoPath, '.git'))) {
      console.warn(`No .git directory found at ${repoPath}`)
      return null
    }

    const hash = commitHash || getCurrentCommitHash(repoPath)
    if (!hash) {
      return null
    }

    // Get commit timestamp
    const timestampStr = execSync(`git --no-pager show -s --format=%ct ${hash}`, {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim()

    const timestamp = new Date(parseInt(timestampStr) * 1000)

    // Get commit message (first line only)
    const message = execSync(`git --no-pager show -s --format=%s ${hash}`, {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim()

    // Get commit author
    const author = execSync(`git --no-pager show -s --format=%an ${hash}`, {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim()

    return {
      hash,
      timestamp,
      message,
      author
    }
  } catch (error) {
    console.error('Error getting commit info:', error)
    return null
  }
}

/**
 * Compare current commit with last scan commit
 */
export function compareCommits(
  currentCommit: CommitInfo,
  lastScanCommit?: CommitInfo,
  lastScanDate?: Date
): CommitComparison {
  const hasChanges = !lastScanCommit || currentCommit.hash !== lastScanCommit.hash

  let daysSinceLastScan: number | undefined
  if (lastScanDate) {
    const now = new Date()
    const diffInMs = now.getTime() - lastScanDate.getTime()
    daysSinceLastScan = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
  }

  return {
    currentCommit,
    lastScanCommit,
    hasChanges,
    daysSinceLastScan
  }
}

/**
 * Get repository path for a given repository ID
 * This assumes repositories are cloned to a standard location
 */
export function getRepositoryPath(repositoryId: string): string {
  // Assuming repositories are cloned to tmp/repos/{repositoryId}
  return path.join(process.cwd(), 'tmp', 'repos', repositoryId)
}

/**
 * Get the number of commits between two commit hashes
 */
export function getCommitCountBetween(repoPath: string, fromHash: string, toHash: string): number {
  try {
    if (!existsSync(path.join(repoPath, '.git'))) {
      return 0
    }

    const count = execSync(`git rev-list --count ${fromHash}..${toHash}`, {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim()

    return parseInt(count) || 0
  } catch (error) {
    console.error('Error getting commit count:', error)
    return 0
  }
}

/**
 * Check if repository needs rescan based on commit changes
 */
export async function checkRepositoryNeedsRescan(
  repositoryId: string,
  lastScanCommitHash?: string,
  lastScanDate?: Date
): Promise<CommitComparison | null> {
  try {
    const repoPath = getRepositoryPath(repositoryId)

    // Check if repository exists locally
    if (!existsSync(repoPath)) {
      console.warn(`Repository not found at ${repoPath}`)
      return null
    }

    // Get current commit info
    const currentCommit = getCommitInfo(repoPath)
    if (!currentCommit) {
      console.error('Failed to get current commit info')
      return null
    }

    // Get last scan commit info if hash is provided
    let lastScanCommit: CommitInfo | undefined
    let commitsAhead = 0
    if (lastScanCommitHash) {
      const commit = getCommitInfo(repoPath, lastScanCommitHash)
      lastScanCommit = commit === null ? undefined : commit
      
      // Get number of commits between last scan and current
      if (lastScanCommit) {
        commitsAhead = getCommitCountBetween(repoPath, lastScanCommitHash, currentCommit.hash)
      }
    }

    // Compare commits
    const comparison = compareCommits(currentCommit, lastScanCommit, lastScanDate)
    
    // Add commits ahead information
    return {
      ...comparison,
      commitsAhead
    }
  } catch (error) {
    console.error('Error checking repository rescan needs:', error)
    return null
  }
}
