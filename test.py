n = 4
def isValid(board) :
	for i in range(n) :
		for j in range(n):
			if board[i][j]=="Q":
				for k in range(j+1,n):
					if i+k-j>=n:
						break
					if board[i+k-j][k]=="Q":
						for w in range(n,i,-1):
							board.pop()
						return False
				for k in range(j-1,0,-1):
					if i-k+j>=n:
						break
					if board[i-k+j][k]=="Q":
						for w in range(n,i,-1):
							board.pop()
						return False
				break
	
	return True
b1 = [".Q..",
 ".Q..",
 "...Q",
 "Q..."]

b2 =["..Q.",
 "Q...",
 "...Q",
 ".Q.."]
b4 = [".Q..",
 "...Q",
 "Q...",
 "..Q."]

print(isValid(b1))
print(isValid(b2))
print(isValid(b4))