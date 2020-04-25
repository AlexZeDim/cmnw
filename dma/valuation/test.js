
async function test(start) {
    try {
        let exampleMap = [
            {
                item: 1,
                quantity: 2
            },
            {
                item: 2,
                quantity: 4
            },
            {
                item: 3,
                quantity: 4
            }
        ];
        exampleMap.map((doc, i) => {
            if (doc.item > 1) {
                exampleMap.splice(i, 1);
                let ex = {
                    item: 3,
                    quantity: 4
                };
                console.log(ex);
                exampleMap.push(ex);
                ex = {};
            }
            doc.quantity = doc.quantity+1
        });
        console.log(exampleMap);
    } catch (err) {
        console.log(err);
    }
}

test();