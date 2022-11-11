# Power Boosting Flow
[DB Tables](#tables)

[DB Views](#materialized-views)

[FAQ](#faq)

## tables

### power_boosting 
When a user boost a project we create a record on this table, this is some example data for that
#### query
```
select id, "projectId","userId", "percentage" from power_boosting
order by id DESC
limit 5
```
#### result

|id |projectId|userId|percentage|
|---|---------|------|----------|
|120|911      |68    |17        |
|119|137      |68    |19.09     |
|118|916      |68    |0         |
|117|223531   |68    |12.78     |
|116|2032     |68    |0         |


### power_round
This table just has when record to specify the current round number, we check to update this field with this cronjob expression
`UPDATE_POWER_ROUND_CRONJOB_EXPRESSION` the value of this in staging ENV is `0 */2 * * * *` it means every two minutes

#### query

```
select * from power_round
```
#### result

|id   |round|
|---  |-----|
|true |	1777|

### power_snapshot
In each round we would create some snapshots, for instance in staging each round is **20 min** and we get snapshot every **5 min**
so in each round we would have 4 snapshot 

We fill blockNumber of powerSnapshots that doesnt have it periodically with this cronjob expression
`FILL_BLOCK_NUMBERS_OF_SNAPSHOTS_CRONJOB_EXPRESSION` that in Staging ENV is `3 * * * * *`  it means every minutes we check it

When we insert record in this table?( I couldn't understand @aminlatifi can fill this part)

#### query

```
select id, "blockNumber", "roundNumber" from power_snapshot
order by id DESC
limit 8
```

#### result

|id |blockNumber|roundNumber|
|---|-----------|-----------|
|7055|24935917   |1778       |
|7054|24935873   |1778       |
|7053|24935831   |1778       |
|7052|24935787   |1778       |
|7051|24935743   |1777       |
|7050|24935699   |1777       |
|7049|24935655   |1777       |
|7048|24935611   |1777       |

### power_boosting_snapshot
We have a job in postgres DB (pg_cron) that take snapshot, it means checks what users with balance more than
zero boosted some percentages (more than zero) to verified projects, it inserts one record per each boosting
and relates that to #power_snapshot

#### pg_cron job

```
      CREATE EXTENSION IF NOT EXISTS PG_CRON;

      GRANT USAGE ON SCHEMA CRON TO POSTGRES;

      SELECT CRON.SCHEDULE(
        '${POWER_BOOSTING_SNAPSHOT_TASK_NAME}',
        '${cronJobExpression}',
        $$CALL public."TAKE_POWER_BOOSTING_SNAPSHOT"()$$
      ); 
```
And cronjob calls this [procedure](https://github.com/Giveth/impact-graph/blob/staging/migration/1663594895751-takePowerSnapshotProcedure.ts)


#### query

```
select * from power_boosting_snapshot
order by id DESC
limit 5
```

#### result

|id |userId  |projectId|powerSnapshotId|percentage|
|---|--------|---------|---------------|----------|
|602146|67      |915      |7057           |5.28      |
|602145|67      |137      |7057           |4.96      |
|602144|67      |911      |7057           |11.61     |
|602143|67      |929      |7057           |4.98      |
|602142|67      |223521   |7057           |2.69      |

### power_balance_snapshot
With the above data we know in each snapshot what user boosted what percentage to what project, but we need to know what 
is the givPower balance of user in each snapshot to can **projectRank** the project and calculate the **totalPower**


We check with this cronjob expression `FILL_POWER_SNAPSHOT_BALANCE_CRONJOB_EXPRESSION` that in Staging ENV is `20 */5 * * * *`
means every **5 min** to fill power balance , for users in snapshot that they boosted a project but their balance is not filled 
in that snapshot

How we fill the balance? We already have filled the **blockNumber** in powerSnapshot so we 
call the subgraph and ask user's balance in that specific block

#### query

```
select * from power_balance_snapshot
order by id DESC
limit 5
```

#### result

|id |userId  |powerSnapshotId|balance|
|---|--------|---------------|-------|
|86112|255     |7059           |59509.14|
|86111|157     |7059           |19103.79|
|86110|379     |7059           |100538.4|
|86109|66      |7059           |171808.73|
|86108|168     |7059           |80313.22|

## Materialized views
For ranking project and get list of them, it would be hard and maybe not optimized to query each time
for each web service, so have defined some materialized views and use them for this purpose


### user_project_power_view
We have created that with this [migration](https://github.com/Giveth/impact-graph/blob/staging/migration/1662877385339-UserProjectPowerView.ts)

This view have all calculation of **power_round**, **power_balance_snapshot**, **power_boosting_snapshot**
So with this view you would know each person how much givPower boosted to a project, we should this data
to show it in the GivPower tab in single project view or in m

We refresh this view with `UPDATE_POWER_ROUND_CRONJOB_EXPRESSION` cron job expression that is `0 */2 * * * *`
means every **2 min**


#### query

```
select * from user_project_power_view
limit 5
```

#### result

|id |round   |projectId|userId|boostedPower|
|---|--------|---------|------|------------|
|1  |1780    |82       |66    |85904.365   |
|2  |1780    |82       |67    |0           |
|3  |1780    |82       |68    |0           |
|4  |1780    |82       |168   |0           |
|5  |1780    |82       |246   |1555.1685   |



### project_power_view
We have created that with this [migration](https://github.com/Giveth/impact-graph/blob/staging/migration/1662915983383-ProjectPowerView.ts)

We refresh this view with `UPDATE_POWER_ROUND_CRONJOB_EXPRESSION` cron job expression that is `0 */2 * * * *` 
means every **2 min**

#### query

```
select * from project_power_view
limit 5
```

#### result

|projectId|totalPower|powerRank|round|
|---------|----------|---------|-----|
|918      |457191.48718100006|1        |1779 |
|137      |169562.950621|2        |1779 |
|911      |158504.983757|3        |1779 |
|82       |155876.872369|4        |1779 |
|223531   |129154.467198|5        |1779 |


### project_future_power_view
We have created that with this [migration](https://github.com/Giveth/impact-graph/blob/staging/migration/1667732038996-ProjectFuturePowerView.ts)

We refresh this view with `UPDATE_POWER_ROUND_CRONJOB_EXPRESSION` cron job expression that is `0 */2 * * * *` 
means every **2 min**

In this view despite **project_power_view** we dont wait till end of the round to calculate rank
so users would know what's the rank of project now, so with this feature we would know the rank of project for next round

#### query

```
select * from project_future_power_view
limit 5
```

#### result

|projectId|totalPower|powerRank|round|
|---------|----------|---------|-----|
|918      |457191.48718100006|1        |1779 |
|137      |169562.950621|2        |1779 |
|911      |158504.983757|3        |1779 |
|82       |155876.872369|4        |1779 |
|223531   |129154.467198|5        |1779 |


## FAQ

### What we do if a project that has some boosting got unverified?
When we want to create record for **power_boosting_snapshot** we dont save boostings on unverified projects, so when we
verify the project again from next snapshot we start to count them , so in the period that project was unverified
we haven't saved any power_boosting_snapshot for that project but immediately after it gets verified we start to save 
power_boosting_snapshot for next round

### What if givPower balance of a user who already boosted some project changes during round?
As we get some snapshot during each round, we calculate average of user's balance in each snapshot
so it doesn't matter because we have balance history for that purpose
