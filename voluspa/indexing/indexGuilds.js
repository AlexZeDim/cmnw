function getReportCode(input) {
    const match = input.trim().match(/^(.*reports\/)?([a-zA-Z0-9]{16})\/?(#.*)?$/);
    console.log(match);
}

getReportCode('https://wowanalyzer.com/report/ZBkN67Yj19RJnTAp');