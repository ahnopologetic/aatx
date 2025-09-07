import { getCurrentCommitHash, getCommitInfo, compareCommits } from '../commit-utils'

// Mock the child_process module
jest.mock('child_process', () => ({
  execSync: jest.fn()
}))

// Mock the fs module
jest.mock('fs', () => ({
  existsSync: jest.fn()
}))

describe('commit-utils', () => {
  const mockExecSync = require('child_process').execSync
  const mockExistsSync = require('fs').existsSync

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getCurrentCommitHash', () => {
    it('should return commit hash when git command succeeds', () => {
      mockExistsSync.mockReturnValue(true)
      mockExecSync.mockReturnValue('abc123def456\n')

      const result = getCurrentCommitHash('/test/repo')
      
      expect(result).toBe('abc123def456')
      expect(mockExecSync).toHaveBeenCalledWith('git rev-parse HEAD', {
        cwd: '/test/repo',
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      })
    })

    it('should return null when .git directory does not exist', () => {
      mockExistsSync.mockReturnValue(false)

      const result = getCurrentCommitHash('/test/repo')
      
      expect(result).toBeNull()
      expect(mockExecSync).not.toHaveBeenCalled()
    })

    it('should return null when git command fails', () => {
      mockExistsSync.mockReturnValue(true)
      mockExecSync.mockImplementation(() => {
        throw new Error('Git command failed')
      })

      const result = getCurrentCommitHash('/test/repo')
      
      expect(result).toBeNull()
    })
  })

  describe('getCommitInfo', () => {
    it('should return commit info when all git commands succeed', () => {
      mockExistsSync.mockReturnValue(true)
      mockExecSync
        .mockReturnValueOnce('abc123def456\n') // getCurrentCommitHash
        .mockReturnValueOnce('1640995200\n') // timestamp
        .mockReturnValueOnce('Test commit message\n') // message
        .mockReturnValueOnce('Test Author\n') // author

      const result = getCommitInfo('/test/repo')
      
      expect(result).toEqual({
        hash: 'abc123def456',
        timestamp: new Date(1640995200 * 1000),
        message: 'Test commit message',
        author: 'Test Author'
      })
    })

    it('should return null when repository does not exist', () => {
      mockExistsSync.mockReturnValue(false)

      const result = getCommitInfo('/test/repo')
      
      expect(result).toBeNull()
    })
  })

  describe('compareCommits', () => {
    const currentCommit = {
      hash: 'abc123def456',
      timestamp: new Date('2023-01-01T00:00:00Z'),
      message: 'Current commit',
      author: 'Current Author'
    }

    const lastScanCommit = {
      hash: 'def456ghi789',
      timestamp: new Date('2022-12-31T00:00:00Z'),
      message: 'Last scan commit',
      author: 'Last Author'
    }

    it('should detect changes when commit hashes are different', () => {
      const result = compareCommits(currentCommit, lastScanCommit, new Date('2022-12-31T00:00:00Z'))
      
      expect(result.hasChanges).toBe(true)
      expect(result.currentCommit).toEqual(currentCommit)
      expect(result.lastScanCommit).toEqual(lastScanCommit)
      expect(result.daysSinceLastScan).toBe(1)
    })

    it('should not detect changes when commit hashes are the same', () => {
      const result = compareCommits(currentCommit, currentCommit, new Date('2022-12-31T00:00:00Z'))
      
      expect(result.hasChanges).toBe(false)
    })

    it('should detect changes when no previous scan exists', () => {
      const result = compareCommits(currentCommit, undefined, undefined)
      
      expect(result.hasChanges).toBe(true)
      expect(result.lastScanCommit).toBeUndefined()
      expect(result.daysSinceLastScan).toBeUndefined()
    })
  })
})
