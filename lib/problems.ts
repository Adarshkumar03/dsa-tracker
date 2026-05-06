export type Difficulty = "Easy" | "Medium" | "Hard";
export type Category =
  | "Array"
  | "String"
  | "Tree"
  | "Graph"
  | "DP"
  | "LinkedList"
  | "Stack"
  | "Heap"
  | "Binary Search"
  | "Backtracking"
  | "Greedy"
  | "Trie"
  | "Sliding Window"
  | "Two Pointers";

export interface Problem {
  id: string;
  name: string;
  difficulty: Difficulty;
  category: Category;
  tags: string[];
  solved: boolean;
  createdAt: string;
  canvas: {
    constraints: string;
    ideas: Array<{ approach: string; time: string; space: string }>;
    testCases: string;
    edgeCases: string;
    code: string;
    language: string;
  };
}

const EMPTY_CANVAS = {
  constraints: "",
  ideas: [{ approach: "", time: "", space: "" }],
  testCases: "",
  edgeCases: "",
  code: "",
  language: "python",
};

export const INITIAL_PROBLEMS: Problem[] = [
  {
    id: "two-sum",
    name: "Two Sum",
    difficulty: "Easy",
    category: "Array",
    tags: ["hash-map"],
    solved: true,
    createdAt: "2024-01-10",
    canvas: {
      constraints:
        "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9\nOnly one valid answer exists.",
      ideas: [
        {
          approach:
            "Use hash map. For each num, check if (target - num) exists in map.",
          time: "O(n)",
          space: "O(n)",
        },
      ],
      testCases:
        "[2,7,11,15], target=9 → [0,1]\n[3,2,4], target=6 → [1,2]\n[3,3], target=6 → [0,1]",
      edgeCases:
        "Duplicate numbers\nNegative numbers\nTarget is sum of same element twice",
      code: `def twoSum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i`,
      language: "python",
    },
  },
  {
    id: "valid-parentheses",
    name: "Valid Parentheses",
    difficulty: "Easy",
    category: "Stack",
    tags: ["stack"],
    solved: true,
    createdAt: "2024-01-12",
    canvas: { ...EMPTY_CANVAS },
  },
  {
    id: "longest-substring",
    name: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    category: "Sliding Window",
    tags: ["sliding-window", "hash-map"],
    solved: false,
    createdAt: "2024-01-15",
    canvas: { ...EMPTY_CANVAS },
  },
  {
    id: "binary-tree-level-order",
    name: "Binary Tree Level Order Traversal",
    difficulty: "Medium",
    category: "Tree",
    tags: ["bfs", "queue"],
    solved: false,
    createdAt: "2024-01-18",
    canvas: { ...EMPTY_CANVAS },
  },
  {
    id: "coin-change",
    name: "Coin Change",
    difficulty: "Medium",
    category: "DP",
    tags: ["dp", "bfs"],
    solved: false,
    createdAt: "2024-01-20",
    canvas: { ...EMPTY_CANVAS },
  },
  {
    id: "merge-k-sorted",
    name: "Merge K Sorted Lists",
    difficulty: "Hard",
    category: "Heap",
    tags: ["heap", "linked-list", "divide-conquer"],
    solved: false,
    createdAt: "2024-01-22",
    canvas: { ...EMPTY_CANVAS },
  },
];