const Empty = 0
const Pawn = 1
const Rook = 2
const Knight = 3
const Bishop = 4
const Queen = 5
const King = 6

const White = 0
const Black = 1

const E = {
  typ: Empty
}

const P = {
  typ: Pawn,
  side: Black
}
const R = {
  typ: Rook,
  side: Black
}
const N = {
  typ: Knight,
  side: Black
}
const B = {
  typ: Bishop,
  side: Black
}
const Q = {
  typ: Queen,
  side: Black
}
const K = {
  typ: King,
  side: Black
}

const p = {
  typ: Pawn,
  side: White
}
const r = {
  typ: Rook,
  side: White
}
const n = {
  typ: Knight,
  side: White
}
const b = {
  typ: Bishop,
  side: White
}
const q = {
  typ: Queen,
  side: White
}
const k = {
  typ: King,
  side: White 
}

// make all of these immutable
for (var o of [E, P, p, R, r, N, n, B, b, Q, q, K, k]) {
  Object.freeze(o)
}

function render_board(state, playing_side) {
  const table = document.getElementById("chessboard")
  const rows = table.children[0].children
  for (var j = 0; j < 8; j++) {
    for (var i = 0; i < 8; i++) {
      var t = ""
      switch (state.board[j][i].typ) {
        case Pawn:
          t = (state.board[j][i].side == White) ? "\u2659" : "\u265f"
          break;
        case Knight:
          t = (state.board[j][i].side == White) ? "\u2658" : "\u265e"
          break;
        case Bishop:
          t = (state.board[j][i].side == White) ? "\u2657" : "\u265d"
          break;
        case Rook:
          t = (state.board[j][i].side == White) ? "\u2656" : "\u265c"
          break;
        case Queen:
          t = (state.board[j][i].side == White) ? "\u2655" : "\u265b"
          break;
        case King:
          t = (state.board[j][i].side == White) ? "\u2654" : "\u265a"
          break;
      }
      if (playing_side == White) {
        rows[j].children[i].textContent = t
      } else {
        rows[7-j].children[7-i].textContent = t
      }
    }
  }
}

function active_side(state) {
  return ((state.moves.length % 2) == 0) ? White : Black;
}

function is_empty(state, j, i) {
  return out_of_bounds(j, i) || (state.board[j][i].typ == Empty)
}

function is_enemy(state, j, i, side) {
  return !out_of_bounds(j, i) && (state.board[j][i].typ != Empty) && (state.board[j][i].side != side)
}

function get_piece_at(state, j, i) {
  if (out_of_bounds(state, j, i)) {
    return E
  }
  return state.board[j][i]
}

function opposite_side(side) {
  return (side == White) ? Black : White
}

// check if the last move was a pawn moving two spaces up from a particular side;
// used to check for en passant
function last_move_was_double_pawn(state, side) {
  if (state.moves.length == 0) {
    return false
  }
  var last_move = state.moves[state.moves.length - 1]
  var last_piece_moved = state.board[last_move.dst.row][last_move.dst.col]

  return (last_piece_moved.typ == Pawn) && (last_piece_moved.side == side) && 
      (Math.abs(last_move.dst.row - last_move.src.row) == 2)
}

function move_is_castle(state, move) {
  const moved_piece = state.board[move.src.row][move.src.col]
  return (moved_piece.typ == King) && (Math.abs(move.dst.col - move.src.col) != 1) && (Math.abs(move.dst.row - move.src.row) == 0)
}

function make_move_unchecked(state, move) {
  if (out_of_bounds(move.src.row, move.src.col), out_of_bounds(move.dst.row, move.dst.col)) {
    console.log("W: move out of bounds ", move)
    return
  }
  const moved_piece = state.board[move.src.row][move.src.col]
  const is_castle = move_is_castle(state, move)

  if (!is_empty(state, move.dst.row, move.dst.col) && (state.board[move.dst.row][move.dst.col].side != opposite_side(moved_piece.side))) {
    console.log("W: piece capturing same side ", state.copy(), move)
    return
  }

  if (!is_castle) {
    state.board[move.src.row][move.src.col] = E
    if (!move.promotion) {
      state.board[move.dst.row][move.dst.col] = moved_piece
    } else {
      var new_piece = E
      switch (move.promotion) {
        case Queen: new_piece = (moved_piece.side == White) ? q : Q
          break
        case Bishop: new_piece = (moved_piece.side == White) ? b : B
          break
        case Knight: new_piece = (moved_piece.side == White) ? n : N
          break
        case Rook: new_piece = (moved_piece.side == White) ? r : R
          break
      }
      state.board[move.dst.row][move.dst.col] = new_piece
    }

    if (move.en_passant) {
      if (state.board[move.src.row][move.dst.col].typ != Pawn) {
        console.log("W: en passant capturing nonpawn piece")
      }
      // capture the pawn here
      state.board[move.src.row][move.dst.col] = E
    }

    if (moved_piece.typ == Rook) {
      if (move.src.col == 0) {
        // disable kingside castle
        state.can_castle[moved_piece.side][0] = false
      } else {
        // disable queenside castle
        state.can_castle[moved_piece.side][1] = false
      }
    }

    // see if the move is capturing a rook in its home position
    // any capture on these squares will invalidate castle;
    // either the rook is there and it's captured and it's moved and
    // castling is already forbidden
    const kingside_row = [7, 0]
    if (move.dst.row == kingside_row[opposite_side(moved_piece.side)]) {
      if (move.dst.col == 0) {
        state.can_castle[opposite_side(moved_piece.side)][0] = false
      } else if (move.dst.col == 7) {
        state.can_castle[opposite_side(moved_piece.side)][1] = false
      }
    }

    // can't castle no more
    if (moved_piece.typ == King) {
      state.can_castle[moved_piece.side][0] = false
      state.can_castle[moved_piece.side][1] = false
    }
  } else {
    // it's a castle
    state.board[move.src.row][move.src.col] = E
    state.board[move.dst.row][move.dst.col] = moved_piece

    // move rook
    rook_src_col = (move.dst.col == 2) ? 0 : 7
    rook_dst_col = (move.dst.col == 2) ? 3 : 5
    const rook = state.board[move.src.row][rook_src_col]
    state.board[move.src.row][rook_src_col] = E
    state.board[move.src.row][rook_dst_col] = rook

    // adjust castling state
    state.can_castle[moved_piece.side][0] = false
    state.can_castle[moved_piece.side][1] = false
  }

  state.moves.push(move)
}

function out_of_bounds(j, i) {
  return (j < 0) || (j >= 8) || (i < 0) || (i >= 8)
}

function is_in_bounds(j, i) {
  return !out_of_bounds(j, i)
}

// TODO maybe take advantage of the fact that all the pieces are singletons
// and use a reference comparison instead of checking type and side
function has_piece_at(state, j, i, piece_typ, piece_side) {
  return !out_of_bounds(j, i) && (state.board[j][i].typ == piece_typ) && (state.board[j][i].side == piece_side)
}

// see if this square is attacked by a piece of type piece_typ on side piece_side
function is_attacked_by(state, j, i, piece_typ, piece_side) {
  switch (piece_typ) {
      // NOTE: ignoring en passant
    case Pawn:
      var dir = -1
      if (piece_side == Black) {
        dir = 1
      }
      for (var oi of [-1, 1]) {
        const nj = j - dir
        const ni = i + oi
        if (out_of_bounds(j, i)) {
          continue
        }
        if (has_piece_at(state, nj, ni, piece_typ, piece_side)) {
          return [nj, ni]
        }
      }
      break
    case Rook:
    case Bishop:
    case Queen:
      const r_dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]]
      const b_dirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]]
      const q_dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
      var dirs = []
      switch (piece_typ) {
        case Rook: dirs = r_dirs
          break
        case Bishop: dirs = b_dirs
          break
        case Queen: dirs = q_dirs
          break
      }
      for (var dir of dirs) {
        // raycast in all directions until it's out of bounds or it hits a piece
        var nj = j + dir[0]
        var ni = i + dir[1]
        while (!out_of_bounds(nj, ni) && is_empty(state, nj, ni)) {
          nj += dir[0]
          ni += dir[1]
        }
        if (out_of_bounds(nj, ni)) {
          continue
        }
        if (has_piece_at(state, nj, ni, piece_typ, piece_side)) {
          return [nj, ni]
        }
      }
      break
    case Knight:
      const ls = [[1, 2], [2, 1]]
      for (var l of ls) {
        for (var rdir of [-1, 1]) {
          for (var cdir of [-1, 1]) {
            const dr = l[0] * rdir
            const dc = l[1] * cdir

            const dst_r = j + dr
            const dst_c = i + dc

            if (!out_of_bounds(dst_r, dst_c)) {
              if (has_piece_at(state, dst_r, dst_c, piece_typ, piece_side)) {
                return [dst_r, dst_c]
              }
            }
          }
        }
      }

      break
    case King:
      // castle can't attack a piece, so only check 1 square moves
      for (var oj = -1; oj <= 1; oj++) {
        for (var oi = -1; oi <= 1; oi++) {
          const nj = j + oj
          const ni = i + oi

          // skip checking the square itself
          if ((oi == 0) && (oj == 0)) {
            continue
          }
          if (out_of_bounds(nj, ni)) {
            continue
          }

          if (has_piece_at(state, nj, ni, piece_typ, piece_side)) {
            return [nj, ni]
          }
        }
      }
      break
  }
  return false
}

function is_attacked_by_any(state, j, i, side) {
  const piece_types = [Pawn, Rook, Knight, Bishop, Queen, King]
  for (var typ of piece_types) {
    if (is_attacked_by(state, j, i, typ, opposite_side(side))) {
      return true
    }
  }
  return false
}

function is_in_check(state, side) {
  // find the king
  var king_row = -1, king_col = -1
  for (var j = 0; j < 8; j++) {
    for (var i = 0; i < 8; i++) {
      if ((state.board[j][i].typ == King) && (state.board[j][i].side == side)) {
        king_row = j
        king_col = i
        break
      }
    }
  }
  if ((king_row == -1) || (king_col == -1)) {
    console.log("W: king not found ", state.copy())
    return false
  }
  // see if he is attacked by any enemy piece
  return is_attacked_by_any(state, king_row, king_col, side)
}

function calc_moves(j, i) {
  const piece_type = this.board[j][i].typ
  const piece_side = this.board[j][i].side

  if (piece_type == Empty) {
    return []
  }
  // check to make sure it's the right side
  if (piece_side != active_side(this)) {
    console.log("W: wrong side trying to make a move")
    return []
  }

  var possible_moves = []
  switch (piece_type) {
    case Pawn:
      const possible_promotions = [Queen, Bishop, Knight, Rook]
      var d = -1
      var last_row = 1
      var first_row = 6
      if (piece_side == Black) {
        d = 1
        last_row = 6
        first_row = 1
      }

      // double move on first move
      if ((j == first_row) && is_empty(this, j+d, i) && is_empty(this, j+d+d, i)) {
        possible_moves.push({ row: j+d+d, col: i })
      }
      if (is_empty(this, j+d, i)) {
        if (j != last_row) {
          // forward one
          possible_moves.push({ row: j+d, col: i })
        } else {
          for (var p of possible_promotions) {
            possible_moves.push({ row: j+d, col: i, promotion: p })
          }
        }
      }
      // diagonal capture
      if ((i != 0) && is_enemy(this, j+d, i-1, piece_side)) {
        if (j != last_row) {
          possible_moves.push({ row: j+d, col: i-1 })
        } else {
          for (var p of possible_promotions) {
            possible_moves.push({ row: j+d, col: i-1, promotion: p })
          }
        }
      }
      if ((i != 7) && is_enemy(this, j+d, i+1, piece_side)) {
        if (j != last_row) {
          possible_moves.push({ row: j+d , col: i+1 })
        } else {
          for (var p of possible_promotions) {
            possible_moves.push({ row: j+d, col: i+1, promotion: p })
          }
        }
      }
      // en passant; last move was a pawn moving twice that's one over from the current pawn
      if ((this.moves.length > 0)) {
        const last_move = this.moves[this.moves.length - 1]
        if (last_move_was_double_pawn(this, opposite_side(piece_side)) &&
            (Math.abs(last_move.dst.col - i) == 1) && (last_move.dst.row == j)) {
          possible_moves.push({row: j + d, col: last_move.dst.col, en_passant: true})
        }
      }
      break

    case Rook:
    case Bishop:
    case Queen:
      const r_dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]]
      const b_dirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]]
      const q_dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
      var dirs = []
      switch (piece_type) {
        case Rook: dirs = r_dirs
          break
        case Bishop: dirs = b_dirs
          break
        case Queen: dirs = q_dirs
          break
      }
      for (var dr of dirs) {
        var cur_r = j + dr[0]
        var cur_c = i + dr[1]
        while ((cur_r >= 0) && (cur_r < 8) && (cur_c >= 0) && (cur_c < 8)) {
          if (!is_empty(this, cur_r, cur_c)) {
            if (is_enemy(this, cur_r, cur_c, piece_side)) {
              possible_moves.push({row: cur_r, col: cur_c})
            }
            break
          }
          possible_moves.push({row: cur_r, col: cur_c})
          cur_r += dr[0]
          cur_c += dr[1]
        }
      }
      break
    case Knight:
      const ls = [[1, 2], [2, 1]]
      for (var l of ls) {
        for (var rdir of [-1, 1]) {
          for (var cdir of [-1, 1]) {
            const dr = l[0] * rdir
            const dc = l[1] * cdir

            const dst_r = j + dr
            const dst_c = i + dc

            if (!out_of_bounds(dst_r, dst_c)) {
              if (is_empty(this, dst_r, dst_c) || is_enemy(this, dst_r, dst_c, piece_side)) {
                possible_moves.push({row: dst_r, col: dst_c})
              }
            }
          }
        }
      }
      break
    case King:
      // single step moves
      for (var oj = -1; oj <= 1; oj++) {
        for (var oi = -1; oi <= 1; oi++) {
          const nj = j + oj
          const ni = i + oi

          // skip checking the King's square itself
          if ((oi == 0) && (oj == 0)) {
            continue
          }
          if (out_of_bounds(nj, ni)) {
            continue
          }

          if (is_empty(this, nj, ni) || is_enemy(this, nj, ni, piece_side)) {
            possible_moves.push({ row: nj, col: ni })
          }
        }
      }

      const kingrow = [7, 0]
      const clear_checks = [[1, 2, 3], [5, 6]]
      const attack_checks = [[1, 2, 3, 4], [4, 5, 6]]
      const rook_squares = [0, 7]
      const dst_cols = [2, 6]
      // check castles
      // check queenside castle
      for (var castle_side of [0, 1]) {
        if (!this.can_castle[piece_side][castle_side]) {
          continue
        }

        // check to make sure the squares are clear
        var allclear = true
        for (var ni of clear_checks[castle_side]) {
          if (!is_empty(this, kingrow[piece_side], ni)) {
            allclear = false
            break
          }
        }
        if (!allclear) {
          continue
        }

        // check to make sure the rook is still there
        if (!has_piece_at(this, kingrow[piece_side], rook_squares[castle_side], Rook, piece_side)) {
          continue
        }

        // check if any of the squares the king will move through are being attacked
        var noattacks = true
        for (var ni of attack_checks[castle_side]) {
          if (is_attacked_by_any(this, kingrow[piece_side], ni, piece_side)) {
            noattacks = false
            break
          }
        }

        if (noattacks) {
          possible_moves.push({ row: kingrow[piece_side], col: dst_cols[castle_side] })
        }
      }
      break
  }

  var me = this
  return possible_moves.map(function(m) { 
    if (!m.promotion && !m.en_passant) {
      return { src: { row: j, col: i }, dst: m }
    } else if (m.en_passant) {
      return { src: { row: j, col: i }, dst: { row: m.row, col: m.col }, en_passant: m.en_passant }
    } else {
      return { src: { row: j, col: i }, dst: { row: m.row, col: m.col }, promotion: m.promotion }
    }
  }).filter(function(m) {
    var tmp = me.copy()
    make_move_unchecked(tmp, m)
    return !is_in_check(tmp, piece_side)
  })
}

function calc_all_moves() {
  results = []
  for (var j = 0; j < 8; j++) {
    for (var i = 0; i < 8; i++) {
      if (!is_empty(this, j, i) && this.board[j][i].side == active_side(this)) {
        results = results.concat(this.calc_moves(j, i))
      }
    }
  }

  return results
}

function copy_move(m) {
  if (!m.promotion && !m.en_passant) {
      return {
      src: m.src,
      dst: m.dst
    }
  } else if (m.en_passant) {
    return {
      src: m.src,
      dst: m.dst,
      en_passant: m.en_passant
    }
  } else {
    return {
      src: m.src,
      dst: m.dst,
      promotion: m.promotion
    }
  }
}


function Game() {
  this.board = [
      [R, N, B, Q, K, B, N, R],
      [P, P, P, P, P, P, P, P],
      [E, E, E, E, E, E, E, E],
      [E, E, E, E, E, E, E, E],
      [E, E, E, E, E, E, E, E],
      [E, E, E, E, E, E, E, E],
      [p, p, p, p, p, p, p, p],
      [r, n, b, q, k, b, n, r]
  ]
  this.moves = []
  this.can_castle = [[true, true], [true, true]]
}
Game.prototype = {
  render: function(side) { render_board(this, side) },
  calc_moves: calc_moves,
  calc_all_moves: calc_all_moves,
  make_move_if_valid: function(m) {
    var tmp = this.copy()
    make_move_unchecked(tmp, m)
    var cur_side = active_side(this)
    if (!is_in_check(tmp, cur_side)) {
      this.board = tmp.board
      this.moves = tmp.moves
      this.can_castle = tmp.can_castle
      return true
    } else {
      return false
    }
  },

  copy: function() {
    var ret = new Game()

    const new_moves = []
    for (var move of this.moves) {
      new_moves.push(copy_move(move))
    }

    const new_board = []
    for (var row of this.board) {
      var r = []
      for (var cell of row) {
        r.push(cell)
      }
      new_board.push(r)
    }
    const new_can_castle = [[this.can_castle[0][0], this.can_castle[0][1]], [this.can_castle[1][0], this.can_castle[1][1]]]

    ret.moves = new_moves
    ret.board = new_board
    ret.can_castle = new_can_castle

    return ret
  }
}

function getMoveNotation(state, move) {
  const colnames = "abcdefgh"
  const rownames = "87654321"
  var ret = ""
  // if it's a castle, notate that
  const piece_moved = state.board[move.src.row][move.src.col]
  if (move_is_castle(state, move)) {
    if (move.dst.col == 2) {
      ret = "O-O-O"
    } else {
      ret = "O-O"
    }
  } else {
    switch (piece_moved.typ) {
      case Pawn: ret = ""
        break
      case Rook: ret = "R"
        break
      case Knight: ret = "N"
        break
      case Bishop: ret = "B"
        break
      case Queen: ret = "Q"
        break
      case King: ret = "K"
        break
    }
    // check if it's the only piece that could move to that spot
    var tmp = state.copy()
    tmp.board[move.src.row][move.src.col] = E

    // remove attackers until there are none left
    var attackers = []
    var attacker = is_attacked_by(tmp, move.dst.row, move.dst.col, piece_moved.typ, piece_moved.side)
    while (attacker) {
      console.log(attacker)
      attackers.push(attacker)
      tmp.board[attacker[0]][attacker[1]] = E

      attacker = is_attacked_by(tmp, move.dst.row, move.dst.col, piece_moved.typ, piece_moved.side)
    }
    if (attackers.length > 0) {
      // add something to disambiguate it
      const rowmatch = attackers.some(function(a) { a[0] == move.src.row })
      const colmatch = attackers.some(function(a) { a[1] == move.src.col })
      if (!colmatch) {
        ret += colnames[move.src.col]
      } else if (colmatch && !rowmatch) {
        ret += rownames[move.src.row]
      } else {
        ret += colnames[move.src.col]
        ret += rownames[move.src.row]
      }
    }
    if (!is_empty(state, move.dst.row, move.dst.col)) {
      // add the move's origin column if it's a pawn and the column
      // hasn't already been added (if there is some disambiguating
      // feature added, it must be the column because no two pawns can
      // reach the same square from different rows)
      if ((piece_moved.typ == Pawn) && (ret.length == 0)) {
        ret = colnames[move.src.col]
      }
      ret += "x"
    }
    // add the destination address
    ret += colnames[move.dst.col]
    ret += rownames[move.dst.row]
  }
  // if it's a promotion, append the type the piece is changed to
  if (move.promotion) {
    ret += "="
    switch (move.promotion) {
      case Rook: ret += "R"
        break
      case Knight: ret += "N"
        break
      case Bishop: ret += "B"
        break
      case Queen: ret += "Q"
        break
    }
  }

  // check if it results in a check or checkmate, and append a "+" or "#" if it does
  var tmp = state.copy()
  make_move_unchecked(tmp, move)
  if (is_in_check(tmp, opposite_side(piece_moved.side))) {
    if (tmp.calc_all_moves().length == 0) {
      ret += "#"
    } else {
      ret += "+"
    }
  }

  return ret
}

// encoding logic starts here

function get_move_idx(state, move) {
  const moves = state.calc_all_moves()
  // find the move in the list of all possible moves,
  // that index is the move data
  // prepend with a 16-bit move count, and that's converted into base64
  var idx = -1
  for (var i = 0; i < moves.length; i++) {
    if (move.en_passant) {
      if (!moves[i].en_passant) {
        continue
      }
    }
    if (move.promotion) {
      if (!moves[i].promotion || moves[i].promotion != move.promotion) {
        continue
      }
    }
    if ((move.src.col == moves[i].src.col) && 
        (move.src.row == moves[i].src.row) &&
        (move.dst.col == moves[i].dst.col) &&
        (move.dst.row == moves[i].dst.row)) {
      idx = i
      break
    }
  }
  return idx
}

function get_move_from_idx(state, idx) {
  const moves = state.calc_all_moves()

  if (idx < moves.length) {
    return moves[idx]
  } else {
    return null
  }
}

function encode_move(state, move) {
  const idx = get_move_idx(state, move)
  if (idx == -1) {
    console.log("W: found move not in move list")
    return "FUCKTHISSHOULDNTHAPPEN"
  }

  var msg = new Uint8Array(3)
  msg[0] = state.moves.length & 0xff
  msg[1] = (state.moves.length >> 8) & 0xff
  msg[2] = idx

  var msg_str = String.fromCharCode(...msg)
  return btoa(msg_str)
}

function decode_move(state, msg) {
  var msg_str = atob(msg)
  var decoded_idx = (msg_str.charCodeAt(1) << 8) | msg_str.charCodeAt(0)

  if (decoded_idx != state.moves.length) {
    return null
  }
  var decoded_move = msg_str.charCodeAt(2)
  return get_move_from_idx(state, decoded_move)
}

function encode_game(state, playing_as) {
  // first byte contains whether you're playing as white or black
  // second two bytes contain the number of moves played so far
  // the rest are move indices
  var msg_buf = new Uint8Array(3 + state.moves.length)
  if (playing_as == White) {
    msg_buf[0] = 0
  } else {
    msg_buf[0] = 1
  }
  var move_len = state.moves.length
  msg_buf[1] = state.moves.length & 0xff
  msg_buf[2] = (state.moves.length >> 8) & 0xff

  var tmp = new Game()
  for (var i = 0; i < state.moves.length; i++) {
    msg_buf[3 + i] = get_move_idx(tmp, state.moves[i])
    make_move_unchecked(tmp, state.moves[i])
  }
  var msg_str = String.fromCharCode(...msg_buf)
  return btoa(msg_str)
}

function get_move_formatted(state, move) {
  var ret = ""
  if (active_side(state) == White) {
    ret += (state.moves.length/2 + 1).toString() + "."
  }
  ret += " "
  ret += getMoveNotation(state, move)
  ret += " "
  return ret
}

function decode_game(msg) {
  var msg_str = atob(msg)
  var ml = ""
  const playing_as = ((msg_str.charCodeAt(0) & 0x1) == 0) ? White : Black
  const move_len = (msg_str.charCodeAt(2) << 8) | msg_str.charCodeAt(1)

  if ((move_len + 3) > msg_str.length) {
    console.log("invalid game found! invalid move length")
    return null
  }
  var tmp = new Game()
  for (var i = 0; i < move_len; i++) {
    const m = get_move_from_idx(tmp, msg_str.charCodeAt(i + 3))
    ml += get_move_formatted(tmp, m)
    make_move_unchecked(tmp, m)
  }
  return [tmp, playing_as, ml]
}

function encode_last_move(state) {
  if (state.moves.length == 0) {
    return ""
  }
  var tmp = new Game()
  for (var i = 0; i < state.moves.length - 1; i++) {
    make_move_unchecked(tmp, state.moves[i])
  }
  return encode_move(tmp, state.moves[state.moves.length - 1])
}

// ui logic starts here

var single_player = false

var playing_side = White
var cur_game = new Game()
var past_game = null

var selected_j = -1, selected_i = -1
var valid_moves = null

var selected_move = null
var promotion_selected = false
var next_move = null

var movelist = ""

function reset_ui() {
  selected_j = -1
  selected_i = -1
  valid_moves = null

  selected_move = null
  promotion_selected = false
  next_move = null
}

function selected() {
  return !out_of_bounds(selected_j, selected_i)
}

function t(v) {
  return (playing_side == White) ? v : 7-v
}

function update_ui() {
  const table = document.getElementById("chessboard")
  const rows = table.children[0].children

  if (past_game != null) {
    past_game.render(playing_side)
  } else if (next_move == null) {
    cur_game.render(playing_side)
  } else {
    next_move.render(playing_side)
  }

  // act normally if we're not peeking at the past
  if (past_game == null) {
    if (selected()) {
      if (selected_move == null) {
        for (var j = 0; j < 8; j++) {
          for (var i = 0; i < 8; i++) {
            rows[j].children[i].classList.remove("selected")
          }
        }

        if (valid_moves == null) {
          console.log("W: valid_moves was null while a piece was selected")
        } else {
          for (var m of valid_moves) {
            rows[t(m.dst.row)].children[t(m.dst.col)].classList.add("selected")
          }
        }
      } else {
        for (var j = 0; j < 8; j++) {
          for (var i = 0; i < 8; i++) {
            rows[j].children[i].classList.remove("selected")
          }
        }

        rows[t(selected_move.src.row)].children[t(selected_move.src.col)].classList.add("selected")
        rows[t(selected_move.dst.row)].children[t(selected_move.dst.col)].classList.add("selected")
      }
    } else {
      for (var j = 0; j < 8; j++) {
        for (var i = 0; i < 8; i++) {
          rows[j].children[i].classList.remove("selected")
        }
      }
    }

    if (selected_move != null && (!selected_move.promotion || promotion_selected)) {
      document.getElementById("confirm").disabled = false
      document.getElementById("cancel").disabled = false
    } else {
      document.getElementById("confirm").disabled = true
      document.getElementById("cancel").disabled  = true
    }

    // update the state of the promotion menu
    if (selected_move != null && selected_move.promotion && !promotion_selected) {
      document.getElementById("promotion").classList.remove("invisible")
    } else {
      document.getElementById("promotion").classList.add("invisible")
    }

    // update the current move and selected move entries
    document.getElementById("current_move").textContent = (active_side(cur_game) == White) ? "white" : "black"

    const selected_div = document.getElementById("selected_div")
    if (selected_move != null) {
      if (active_side(cur_game) == White) {
        selected_div.textContent = ""
      } else {
        selected_div.textContent = "..."
      }
      selected_div.textContent += getMoveNotation(cur_game, selected_move)
    } else if (!out_of_bounds(selected_j, selected_i)) {
      switch (cur_game.board[selected_j][selected_i].typ) {
        case Pawn: selected_div.textContent = "pawn"
          break
        case Rook: selected_div.textContent = "rook"
          break
        case Knight: selected_div.textContent = "knight"
          break
        case Queen: selected_div.textContent = "queen"
          break
        case King: selected_div.textContent = "king"
          break
        case Empty: selected_div.textContent = "-"
          break
      }
    } else {
      selected_div.textContent = ""
    }
  } else {
    // if we're in history mode,
    // basically just select the last move that was made 
    for (var j = 0; j < 8; j++) {
      for (var i = 0; i < 8; i++) {
        rows[j].children[i].classList.remove("selected")
      }
    }

    if (past_game.moves.length > 0) {
      last_move = past_game.moves[past_game.moves.length - 1]
      rows[t(last_move.src.row)].children[t(last_move.src.col)].classList.add("selected")
      rows[t(last_move.dst.row)].children[t(last_move.dst.col)].classList.add("selected")
    }

    // also update current move
    document.getElementById("current_move").textContent = (active_side(cur_game) == White) ? "white" : "black"

    document.getElementById("confirm").disabled = true
    document.getElementById("cancel").disabled  = true
  }

  // update history button states
  if (past_game == null) {
    document.getElementById("peek_forward").disabled = true
    document.getElementById("back_to_the_future").disabled = true
  } else {
    document.getElementById("peek_forward").disabled = false
    document.getElementById("back_to_the_future").disabled = false
  }

  if (((past_game != null) && (past_game.moves.length > 0)) ||
      (cur_game.moves.length > 0)) {
    document.getElementById("time_travel").disabled = false
    document.getElementById("peek_back").disabled = false
  } else {
    document.getElementById("time_travel").disabled = true
    document.getElementById("peek_back").disabled = true
  }

  document.getElementById("playing_as").textContent = (playing_side == White) ? "white" : "black"
  document.getElementById("movelist").textContent = movelist
}

function promotion_handler(typ) {
  return function() {
    if ((selected_move != null) && selected_move.promotion && !promotion_selected) {
      selected_move.promotion = typ
      promotion_selected = true
      next_move = cur_game.copy()
      next_move.make_move_if_valid(selected_move)

      update_ui()
    }
  }
}

function try_select(j, i) {
  if (selected_move != null) {
    return
  }

  var selected_piece = cur_game.board[j][i]

  if (selected_piece != E && selected_piece.side == active_side(cur_game)) {
    selected_j = j
    selected_i = i
    valid_moves = cur_game.calc_moves(j, i)

    if (valid_moves.length == 0) {
      reset_ui()
    }
  } else {
    reset_ui()
  }
}

function onclickhandler(j, i) {
  return function() {
    const tj = t(j)
    const ti = t(i)
    if ((past_game == null) && (single_player || (active_side(cur_game) == playing_side))) {
      if (next_move == null) {
        if (!selected()) {
          try_select(tj, ti)
        } else {
          // see if a valid move was selected
          var wasmove = false
          for (var m of valid_moves) {
            if ((m.dst.row == tj) && (m.dst.col == ti)) {
              wasmove = true
              selected_move = m
              promotion_selected = false
              next_move = cur_game.copy()
              next_move.make_move_if_valid(m)
              break
            }
          }

          // unselect the piece if the square that was clicked wasn't valid
          if (!wasmove) {
            try_select(tj, ti)
          }
        }
      }
      update_ui()
    }

    if (!single_player && (active_side(cur_game) != playing_side)) {
      alert("it's not your move!")
    }
  }
}

function add_to_movelist(state, move) {
  movelist += get_move_formatted(state, move)
}

function send_toast(msg) {
  const snackbar = document.getElementById("snackbar")
  snackbar.textContent = msg
  snackbar.classList.add("show")

  setTimeout(function(){
    snackbar.classList.remove("show")
  }, 3000);
}

function confirm_move() {
  if (selected_move == null) {
    return
  }

  var link_hash = encode_move(cur_game, selected_move)
  add_to_movelist(cur_game, selected_move)
  cur_game = next_move

  selected_j = -1
  selected_i = -1
  valid_moves = null

  selected_move = null
  promotion_selected = false
  next_move = null

  update_ui()

  // save to localstorage
  localStorage.setItem("game", encode_game(cur_game, playing_side))

  // pop up a link or whatever
  document.getElementById("link").value = window.location.protocol + "//" + window.location.host + window.location.host + window.location.pathname + "#" + link_hash
  document.getElementById("link").focus()
  document.getElementById("link").select()
  document.execCommand("copy")

  send_toast("send the link to your friend so they can play")
}

function cancel_move() {
  if (selected_move == null) {
    return
  }
  reset_ui()

  update_ui()
}

function back_one() {
  reset_ui()

  if (past_game == null) {
    past_game = cur_game.copy()
  }

  // lmao, gonna have to start from scratch and repeat all the moves
  new_past_game = new Game()
  movelist = ""

  for (var i = 0; i < past_game.moves.length - 1; i++) {
    add_to_movelist(new_past_game, past_game.moves[i])
    make_move_unchecked(new_past_game, past_game.moves[i])
  }

  past_game = new_past_game
  update_ui()
}

function back_all() {
  reset_ui()

  past_game = new Game()
  movelist = ""

  update_ui()
}

function forward_one() {
  reset_ui()

  // replay one move from cur_game
  // if we're already at the latest, go switch back to normal mode
  if (past_game.moves.length >= cur_game.moves.length) {
    console.log("W: we need more power")
    past_game = null
    update_ui()
    return
  }
  const move_idx = past_game.moves.length
  add_to_movelist(past_game, cur_game.moves[move_idx])
  make_move_unchecked(past_game, cur_game.moves[move_idx])
  update_ui()
}

function forward_all() {
  reset_ui()

  // replay all the moves to get the move list back up to date
  for (var i = past_game.moves.length; i < cur_game.moves.length; i++) {
    add_to_movelist(past_game, cur_game.moves[i])
    make_move_unchecked(past_game, cur_game.moves[i])
  }

  // remove past_game to return to normal mode
  past_game = null
  update_ui()
}

function new_game() {
  if (confirm("Are you sure you want to start a new game? This will delete any game you have in progress")) {
    localStorage.clear()
    playing_side = White

    past_game = null
    movelist = ""

    cur_game = new Game()
    reset_ui()
    update_ui()
  }
}

function init() {
  const table = document.getElementById("chessboard")
  const rows = table.children[0].children
  for (var j = 0; j < 8; j++) {
    for (var i = 0; i < 8; i++) {
      rows[j].children[i].addEventListener("click", onclickhandler(j, i))
    }
  }

  document.getElementById("confirm").addEventListener("click", confirm_move)
  document.getElementById("cancel").addEventListener("click", cancel_move)

  document.getElementById("pick_queen").addEventListener("click", promotion_handler(Queen))
  document.getElementById("pick_bishop").addEventListener("click", promotion_handler(Bishop))
  document.getElementById("pick_knight").addEventListener("click", promotion_handler(Knight))
  document.getElementById("pick_rook").addEventListener("click", promotion_handler(Rook))
  document.getElementById("cancel_promotion").addEventListener("click", cancel_move)

  document.getElementById("time_travel").addEventListener("click", back_all)
  document.getElementById("peek_back").addEventListener("click", back_one)
  document.getElementById("peek_forward").addEventListener("click", forward_one)
  document.getElementById("back_to_the_future").addEventListener("click", forward_all)

  document.getElementById("newgame").addEventListener("click", new_game)

  // try to load a game from LocalStorage
  const maybe_game = localStorage.getItem("game")
  if (maybe_game != null) {
    console.log("found game! loading from local storage")
    const decoded_game = decode_game(maybe_game)
    if (decoded_game != null) {
      const [game, playing_as, ml] = decoded_game

      cur_game = game
      movelist = ml
      playing_side = playing_as
    }
  }

  // if there is a message in the URI try to load it as a move
  // play as the currently active player
  if (window.location.hash.length > 1) {
    console.log("found hash, trying to decode")
    const maybe_move = decode_move(cur_game, window.location.hash.slice(1))
    if (maybe_move != null) {
      console.log("decoded successfully")
      add_to_movelist(cur_game, maybe_move)
      make_move_unchecked(cur_game, maybe_move)
      playing_side = active_side(cur_game)
    }
  }

  if (playing_side != active_side(cur_game)) {
    const link_hash = encode_last_move(cur_game)
    document.getElementById("link").value = window.location.protocol + "//" + window.location.host + window.location.host + window.location.pathname + "#" + link_hash
    document.getElementById("link").focus()
    document.getElementById("link").select()
    send_toast("send the link to your friend so they can play")
  }

  update_ui()
}
