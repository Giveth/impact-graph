# Power Boosting Flow
[DB Tables](#tables)

[DB Views](#materialized-views)

[FAQ](#faq)

## tables

### power_boosting 
When a user boosts a project we create a record in this table, this is some example data for that
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

### pg_cron job
`pg_cron` extensions help reliably and precisely taking snapshots by calling `TAKE_POWER_BOOSTING_SNAPSHOT` procedure on time.
```
      CREATE EXTENSION IF NOT EXISTS PG_CRON;

      GRANT USAGE ON SCHEMA CRON TO POSTGRES;

      SELECT CRON.SCHEDULE(
        '${POWER_BOOSTING_SNAPSHOT_TASK_NAME}',
        '${cronJobExpression}',
        $$CALL public."TAKE_POWER_BOOSTING_SNAPSHOT"()$$
      ); 
```

Snapshots are taken by calling "TAKE_POWER_BOOSTING_SNAPSHOT" procedure by postgres cron job by the help of pg_cron extension.
The procedure saves a new record of `power_snapshot` with a snapshot time in the its time field.
The procedures also copies `power_boosting` table values corresponding to verified projects in `power_boosting_snapshot` table.

And cronjob calls this: [procedure](https://github.com/Giveth/impact-graph/blob/staging/migration/1663594895751-takePowerSnapshotProcedure.ts)

### power_snapshot
In each round, we create some snapshots. For instance, in staging (GIVeconomy deployment) each round lasts **20 min** and we take a snapshot every **5 min**,
so each round consists of 4 snapshots. In production that would be one snapshot every 4 hours, and a round duration of 14 days.


Each new `power_snapshot` record has empty blockNumber and roundNumber values. The impact-graph backend fills those fields by running a cron job with the expression
`FILL_BLOCK_NUMBERS_OF_SNAPSHOTS_CRONJOB_EXPRESSION` that in Staging ENV is set to `3 * * * * *` it means every minute (at the 3rd second) impact-graph searches for
incomplete `power_snapshot` records and make them complete by blockNumber and roundNumber values corresponding to its time field.

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
As mentioned above, some `power_boosting_snapshot` records are created during `TAKE_POWER_BOOSTING_SNAPSHOT` procedure call to save boosting to verified projects at the time of the snapshot.
Each created `power_boosting_snapshot` record, created by `TAKE_POWER_BOOSTING_SNAPSHOT` procedure, points to the same `power_snapshot` record created at the same procedure call.

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
With the above data we know in each snapshot which user boosted what percentage to a project, but we need to know  
the givPower balance of users in each snapshot in order to determine **totalPower** for the project and then calculate the **projectRank**


We check with this cronjob expression `FILL_POWER_SNAPSHOT_BALANCE_CRONJOB_EXPRESSION` that in Staging ENV is `20 */5 * * * *`
means every **5 min** to fill power balance, for users that boosted a project in a snapshot but their corresponding balance at the time of the snapshot is not filled.

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
To calculate the project boost value, per user and project total, it's not optimal to run the query on each
request. Therefore, we have defined two materialized views to avoid data redundancy and utilize indexing features.


### user_project_power_view
We have created that with this [migration](https://github.com/Giveth/impact-graph/blob/staging/migration/1662877385339-UserProjectPowerView.ts)

This view has all calculations of **power_round**, **power_balance_snapshot**, **power_boosting_snapshot**
So with this view you would know each person how much givPower boosted to a project, we should this data
to show it in the GIVpower tab in single project view.

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

This view is like the above one, but calculates projects total power and rank them based on this value. We use it to join project query with this data and sort the result.

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

In this view despite **project_power_view**, we use next round value to join with snapshots.
Therefore, users would know what will be the rank of the project in the next round.

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

#### Power Boosting Snapshot, Power Balance Snapshot and Power Snapshot Historic tables

Eventually our snapshot tables will be filled with a lot of information,
this degrades the performance of the queries and the server. To solve this
a cronjob will run periodically set by `ARCHIVE_POWER_BOOSTING_OLD_SNAPSHOT_DATA_CRONJOB_EXPRESSION` variable.

This cronjob executes the procedure `ARCHIVE_POWER_BOOSTING_OLD_SNAPSHOT_DATA` that removes the data from `power_boosting_snapshot`, `power_balance_snapshot`, `power_snapshot` that is older than 2 rounds from the current powerRound.

The deleted information is moved to the tables `power_balance_snapshot_history`, `power_boosting_snapshot_history` and `power_snapshot_history`.

## Project status changes affection on power boosting and ranking

### Cancelled
When a project becomes cancelled, we set all GIVpower allocations to (percentages) that project zero.
In that case, the allocation values are added to other projects were supported by corresponding users proportionally.
https://github.com/Giveth/giveth-dapps-v2/issues/1837

**PS** However, we dont delete the snapshots' history of GIVpower boosting. Therefore, if the project gets active and verified again, the history of GIVpower allocations before cancellation will be included in projects total GIVpower and ranking in the leaderboard. (but we thought it's as super rare case)

### Unverified/Verified
When a project becomes unverified, we remove it from GIVpower ranking, and also we stop taking snapshot of GIVpower boosting to it.
Nevertheless, the project doesn't lose its boosting history. We will notify 
users who had boosted the project and inform them that they project is not verified anymore and their GIVpower allocation are being wasted. https://github.com/Giveth/GIVeconomy/issues/749.

If a project becomes verified again, it will have GIVpower rank and return back to the leaderboard. Moreover, GIVpower allocations to it will be recorded again in the next snapshots. (obviously it would not have any snapshot for the time that project
was unverified)
https://github.com/Giveth/GIVeconomy/issues/739

### Activate/Deactivate
When a project becomes deactivated by project owner or the admin, we exclude it from the GIVPower ranking
but keep taking snapshots from its boostings. Therefore, when it becomes activated again, it will appear in the ranking immediately.
https://github.com/Giveth/giveth-dapps-v2/issues/1839

## FAQ

### What we do if a project that has some boosting got unverified?
When we want to create record for **power_boosting_snapshot** we dont save boostings on unverified projects, so when we
verify the project again from next snapshot we start to count them, so in the period that project was unverified
we haven't saved any power_boosting_snapshot for that project but immediately after it gets verified we start to save
power_boosting_snapshot for next round

### What if givPower balance of a user who already boosted some project changes during round?
As we get some snapshot during each round, we calculate of user's balance in each snapshot and boosted values correspondingly.
So it doesn't matter, because we have the balance history for that purpose and the average of values of each round will be the final value.
