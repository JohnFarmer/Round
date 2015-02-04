# shuffle algorithm
fisherYates = (list) ->
    console.log list
    posi = list.length - 1
    if posi == 0 or list == undefined
        return []
    while posi >= 0
        p = Math.floor(Math.random() * posi)
        console.log posi,p
        console.log list
        [list[posi], list[p]] = [list[p], list[posi]]
        posi -= 1
    list

fisherYates [1,2,3,4,5]
    
