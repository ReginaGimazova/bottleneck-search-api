const { Parser } = require('node-sql-parser');
const parser = new Parser();


//ast.where.right.value = 'XXX';

//console.log(ast.columns[0].expr);

export const getSelectQuery = (query: string) => {
    const sqlValues = parser.astify(query).values;
    const selectQueryObjects = sqlValues.map(val => val.value.find(v => (('' + v.value).startsWith('select'))));
    const selectQueries = selectQueryObjects.reduce((result = [], query) => {
        if (query){ result.push(query.value)}
        return result;
    }, []);
    return selectQueries;
};

export const getTableList = () => {
    const opt = {
        database: 'MySQL'
    };

    // let selectQuery = "select user0_.user_id as user_id1_155, user0_.uid as uid2_155, user0_.api_token as api_toke3_155_, user0_.app_id as app_id4_155_, user0_.created as created5_155_, user0_.default_lang as default_6_155_, user0_.disabled as disabled7_155_, user0_.email as email8_155_, user0_.fname as fname9_155_, user0_.password as passwor10_155_, user0_.image1 as image11_155_, user0_.last_login_stamp as last_lo12_155_, user0_.lname as lname13_155_, user0_.last_trans_ref_id as last_tr14_155_, user0_.linked_email as linked_15_155_, user0_.linked_source as linked_16_155_, user0_.locked as locked17_155_, user0_.login_attempt_count as login_a18_155_, user0_.mask as mask19_155_, user0_.merch_id as merch_i31_155_, user0_.name as name20_155_, user0_.original_email as origina21_155_, user0_.original_uid as origina22_155_, user0_.password_last_reset as passwor23_155_, user0_.payout_freeze as payout_24_155_, user0_.reset_token as reset_t25_155_, user0_.reset_token_stamp as reset_t26_155_, user0_.role_id as role_id27_155_, user0_.updated as updated28_155_, user0_.virtual as virtual29_155_, user0_.website as website30_155_ from user user0_ inner join app_to_users apps1_ on user0_.user_id=apps1_.user_id inner join app app2_ on apps1_.app_id=app2_.app_id where app2_.aid=\"wqo9s2cWVd\" and user0_.uid=\"PNIQYOr5hptgkj2\" and user0_.disabled=0";
    let selectQuery = "select \"user0_.user_id\" as user_id1_1 from user_";
    const selectArray = selectQuery.split(' ');
    // const stringifyArray = selectArray.map((part, index) => (selectArray[index - 1] || selectArray[index - 1]) === 'as' ? part = '\"' + part + '\"' : part);
    // selectQuery = stringifyArray.join(' ');

    let tableList;

    try {
        tableList = parser.tableList(selectQuery, opt);
    }
    catch (e) {
       console.log(e);
    }
};