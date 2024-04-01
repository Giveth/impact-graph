# how our Actual matching fund is calculated

## Formula
We use Gitcoin formula you can see the detail https://qf.gitcoin.co/?grant=1,2,3&grant=4,5,6&grant=12,1&grant=8&match=1000
and play it with different amounts to see what happens

## Edge Cases
If you want to see edge cases and how it works, you can see the test cases in
https://github.com/Giveth/impact-graph/blob/staging/src/services/actualMatchingFundView.test.ts

But I will list it down here (although the test cases are more detailed and updated)

* Ensures the view is not null for projects with no donations
In the sheet that we export, we will include all projects of the qf round
whether they have donations or not. If they have no donations, the amount will be null

* Confirms donations from recipients of verified projects are **excluded**
* Confirms donations from recipients of unverified projects are **included**
* Confirms donations from donors of verified projects are **included**
* Confirms donations from donors of unverified projects are **included**
* Validates correct aggregation of multiple donations to a project
* Ensures accurate calculation when a single user makes multiple donations to a project
* Confirms donations under `qfRound.minimumValidUsdValue` are correctly **ignored** in calculations
* Verifies aggregated donations from a user exceeding `qfRound.minimumValidUsdValue` are **included** in calculations
* Asserts that donations to non-verified projects are properly **included**
* Asserts that donations to unlisted projects are properly **included**
* Ensures donations from identified Sybil users are **excluded**
* Validates that donations from users with passport scores lower than `qfRound.minimumPassportScore` are **excluded**
* Validates that donations in non-eligible networks are **excluded** from both pre-analysis and post-analysis
* Confirms that donations to flagged fraud projects are **ignored** in calculations
* Ensures pending and failed donation statuses are **excluded** from both pre-analysis and post-analysis totals

## Estimated Matching
Estimated Matching is like actual matching except we **dont ignore** donations in these cases :
* donations from recipients of verified projects
* donations from users with low passport scores
* donations from sybil users
* donations lower than `qfRound.minimumValidUsdValue`
* donations to flagged fraud projects

